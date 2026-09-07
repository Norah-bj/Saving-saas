package rw.ikiminaconnect.payroll;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import rw.ikiminaconnect.audit.AuditService;
import rw.ikiminaconnect.common.BadRequestException;
import rw.ikiminaconnect.common.NotFoundException;
import rw.ikiminaconnect.member.AppUser;
import rw.ikiminaconnect.member.MemberRepository;
import rw.ikiminaconnect.savings.SavingsService;
import rw.ikiminaconnect.savings.SavingsTxType;

/**
 * Ports the exact validation rules from the frontend's importPayroll action
 * (src/lib/store/data-store.ts) — same three failure reasons, same duplicate
 * -detection-within-one-file rule, same summary shape. Not a redesign: this
 * is the one existing behavior we know is real (the user confirmed the
 * frontend mock's business rules), just moved server-side with Apache POI
 * replacing SheetJS and a real ledger write replacing the mock store update.
 *
 * <p>Hardened in gap-closure phase 5: a row-count cap ({@link #MAX_ROWS_PER_IMPORT}),
 * and each row's actual deduction is attempted (and any failure caught) before
 * that row is counted successful or the summary is built, rather than in a
 * separate pass after the summary already exists — see the loop below and
 * docs/DECISIONS.md for what this does and doesn't guarantee.
 */
@Service
public class PayrollImportService {

    private static final Logger log = LoggerFactory.getLogger(PayrollImportService.class);

    // Defensive cap, not a business rule — a real SACCO-sized organization's
    // roster is nowhere near this; this only exists to fail fast on a
    // pathological upload instead of processing thousands of rows in one
    // request.
    private static final int MAX_ROWS_PER_IMPORT = 5000;

    private final PayrollFileParser payrollFileParser;
    private final PayrollImportSummaryRepository summaryRepository;
    private final PayrollImportRecordRepository recordRepository;
    private final MemberRepository memberRepository;
    private final SavingsService savingsService;
    private final AuditService auditService;

    public PayrollImportService(
            PayrollFileParser payrollFileParser,
            PayrollImportSummaryRepository summaryRepository,
            PayrollImportRecordRepository recordRepository,
            MemberRepository memberRepository,
            SavingsService savingsService,
            AuditService auditService) {
        this.payrollFileParser = payrollFileParser;
        this.summaryRepository = summaryRepository;
        this.recordRepository = recordRepository;
        this.memberRepository = memberRepository;
        this.savingsService = savingsService;
        this.auditService = auditService;
    }

    @Transactional
    public PayrollImportResult importFile(
            UUID organizationId, MultipartFile file, UUID actorId, String actorName) {
        String fileName = file.getOriginalFilename() == null ? "payroll_import.xlsx" : file.getOriginalFilename();

        List<PayrollFileRow> fileRows;
        try {
            fileRows = payrollFileParser.parse(file.getInputStream(), fileName);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }

        if (fileRows.size() > MAX_ROWS_PER_IMPORT) {
            throw new BadRequestException("This file has " + fileRows.size() + " rows, which exceeds the "
                    + MAX_ROWS_PER_IMPORT + "-row limit per import. Split it into smaller files and import "
                    + "them separately.");
        }

        // import_summary_id isn't known until the summary row is saved below,
        // but the record rows need it — build them (with the deduction
        // already attempted, see below) without an id first, then attach it
        // once the summary exists.
        record PendingRow(String employeeId, String nationalId, String name, BigDecimal amount,
                           PayrollImportStatus status, String errorReason) {
        }
        List<PendingRow> pending = new ArrayList<>();
        Set<String> seenEmployeeIds = new HashSet<>();
        int successful = 0;
        int failed = 0;
        int duplicates = 0;
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (PayrollFileRow row : fileRows) {
            if (seenEmployeeIds.contains(row.employeeId())) {
                duplicates++;
                AppUser known = memberRepository.findByOrganizationIdAndEmployeeId(organizationId, row.employeeId())
                        .orElse(null);
                pending.add(new PendingRow(
                        row.employeeId(), known == null ? "" : known.getNationalId(),
                        known == null ? "Unknown" : known.getFullName(), row.amount(),
                        PayrollImportStatus.duplicate, "Duplicate row for this Employee ID in the file."));
                continue;
            }
            seenEmployeeIds.add(row.employeeId());

            AppUser member = memberRepository
                    .findByOrganizationIdAndEmployeeId(organizationId, row.employeeId())
                    .orElse(null);
            if (member == null) {
                failed++;
                pending.add(new PendingRow(
                        row.employeeId(), "", "Unknown", row.amount(),
                        PayrollImportStatus.error, "No matching member for this Employee ID."));
                continue;
            }
            if (row.amount().signum() <= 0) {
                failed++;
                pending.add(new PendingRow(
                        row.employeeId(), member.getNationalId(), member.getFullName(), row.amount(),
                        PayrollImportStatus.error, "Invalid or zero amount."));
                continue;
            }

            // Attempted here, before the row is counted as successful or the
            // summary is built — not deferred to a second pass after the
            // summary is already saved. A failure here (an unexpected
            // application-level error) now downgrades just this row to
            // `error` instead of either silently mis-reporting it as
            // successful or leaving the summary's counts wrong. Doesn't
            // cover every failure mode — a true DB-level error would still
            // only surface at the transaction's final flush and roll back
            // the whole import regardless of this try/catch. See the
            // "transaction safety" note in docs/DECISIONS.md.
            try {
                savingsService.recordDeduction(
                        organizationId, member.getId(), SavingsTxType.SALARY_DEDUCTION, row.amount(),
                        "Monthly salary savings deduction", "Payroll Import — " + fileName);
                successful++;
                totalAmount = totalAmount.add(row.amount());
                pending.add(new PendingRow(
                        row.employeeId(), member.getNationalId(), member.getFullName(), row.amount(),
                        PayrollImportStatus.matched, null));
            } catch (RuntimeException e) {
                log.error("Payroll import: failed to record deduction for employeeId={} in org={}",
                        row.employeeId(), organizationId, e);
                failed++;
                pending.add(new PendingRow(
                        row.employeeId(), member.getNationalId(), member.getFullName(), row.amount(),
                        PayrollImportStatus.error, "Could not record this deduction. Please retry this row separately."));
            }
        }

        PayrollImportSummary summary = new PayrollImportSummary(
                organizationId, fileName, actorId, actorName,
                fileRows.size(), successful, failed, duplicates, totalAmount);
        summary = summaryRepository.save(summary);

        List<PayrollImportRecord> resultRows = new ArrayList<>();
        for (PendingRow row : pending) {
            resultRows.add(recordRepository.save(new PayrollImportRecord(
                    summary.getId(), row.employeeId(), row.nationalId(), row.name(),
                    row.amount(), row.status(), row.errorReason())));
        }

        auditService.record(organizationId, actorId, actorName, "Imported payroll savings",
                fileName + " (" + fileRows.size() + " records)");

        return new PayrollImportResult(
                PayrollImportSummaryDto.from(summary),
                resultRows.stream().map(PayrollImportRecordDto::from).toList());
    }

    @Transactional(readOnly = true)
    public Page<PayrollImportSummaryDto> list(UUID organizationId, Pageable pageable) {
        return summaryRepository.findAllByOrganizationIdOrderByCreatedAtDesc(organizationId, pageable)
                .map(PayrollImportSummaryDto::from);
    }

    @Transactional(readOnly = true)
    public PayrollImportResult get(UUID organizationId, UUID importId) {
        PayrollImportSummary summary = summaryRepository.findByIdAndOrganizationId(importId, organizationId)
                .orElseThrow(() -> new NotFoundException("Payroll import not found."));
        List<PayrollImportRecordDto> rows = recordRepository.findAllByImportSummaryId(importId).stream()
                .map(PayrollImportRecordDto::from)
                .toList();
        return new PayrollImportResult(PayrollImportSummaryDto.from(summary), rows);
    }
}
