package rw.ikiminaconnect.payroll;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import rw.ikiminaconnect.audit.AuditService;
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
 */
@Service
public class PayrollImportService {

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
        List<PayrollFileRow> fileRows;
        try {
            fileRows = payrollFileParser.parse(file.getInputStream());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }

        List<PayrollImportRecord> resultRows = new ArrayList<>();
        Set<String> seenEmployeeIds = new HashSet<>();
        int successful = 0;
        int failed = 0;
        int duplicates = 0;
        BigDecimal totalAmount = BigDecimal.ZERO;

        // import_summary_id isn't known until the summary row is saved below,
        // but the record rows need it — build them without an id first, then
        // attach it once the summary exists (see the loop after this one).
        record PendingRow(String employeeId, String nationalId, String name, BigDecimal amount,
                           PayrollImportStatus status, String errorReason, boolean apply) {
        }
        List<PendingRow> pending = new ArrayList<>();

        for (PayrollFileRow row : fileRows) {
            if (seenEmployeeIds.contains(row.employeeId())) {
                duplicates++;
                AppUser known = memberRepository.findByOrganizationIdAndEmployeeId(organizationId, row.employeeId())
                        .orElse(null);
                pending.add(new PendingRow(
                        row.employeeId(), known == null ? "" : known.getNationalId(),
                        known == null ? "Unknown" : known.getFullName(), row.amount(),
                        PayrollImportStatus.duplicate, "Duplicate row for this Employee ID in the file.", false));
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
                        PayrollImportStatus.error, "No matching member for this Employee ID.", false));
                continue;
            }
            if (row.amount().signum() <= 0) {
                failed++;
                pending.add(new PendingRow(
                        row.employeeId(), member.getNationalId(), member.getFullName(), row.amount(),
                        PayrollImportStatus.error, "Invalid or zero amount.", false));
                continue;
            }

            successful++;
            totalAmount = totalAmount.add(row.amount());
            pending.add(new PendingRow(
                    row.employeeId(), member.getNationalId(), member.getFullName(), row.amount(),
                    PayrollImportStatus.matched, null, true));
        }

        String fileName = file.getOriginalFilename() == null ? "payroll_import.xlsx" : file.getOriginalFilename();
        PayrollImportSummary summary = new PayrollImportSummary(
                organizationId, fileName, actorId, actorName,
                fileRows.size(), successful, failed, duplicates, totalAmount);
        summary = summaryRepository.save(summary);

        for (PendingRow row : pending) {
            resultRows.add(recordRepository.save(new PayrollImportRecord(
                    summary.getId(), row.employeeId(), row.nationalId(), row.name(),
                    row.amount(), row.status(), row.errorReason())));

            if (row.apply()) {
                AppUser member = memberRepository
                        .findByOrganizationIdAndEmployeeId(organizationId, row.employeeId())
                        .orElseThrow(() -> new NotFoundException("Member not found."));
                savingsService.recordDeduction(
                        organizationId, member.getId(), SavingsTxType.SALARY_DEDUCTION, row.amount(),
                        "Monthly salary savings deduction", "Payroll Import — " + fileName);
            }
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
