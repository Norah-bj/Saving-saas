package rw.ikiminaconnect.loan;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.Period;
import java.util.Locale;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rw.ikiminaconnect.audit.AuditService;
import rw.ikiminaconnect.common.BadRequestException;
import rw.ikiminaconnect.common.ForbiddenException;
import rw.ikiminaconnect.common.NotFoundException;
import rw.ikiminaconnect.member.AppUser;
import rw.ikiminaconnect.member.MemberRepository;
import rw.ikiminaconnect.notification.NotificationService;
import rw.ikiminaconnect.notification.NotificationType;
import rw.ikiminaconnect.organization.Organization;
import rw.ikiminaconnect.organization.OrganizationRepository;
import rw.ikiminaconnect.savings.SavingsService;

/**
 * Loan applications (roadmap phase 5). Ports src/lib/store/data-store.ts's
 * applyForLoan and src/lib/loan-calculator.ts exactly for the money math and
 * risk score — see LoanCalculator's javadoc for the one deliberate deviation
 * (org-configurable eligibility threshold instead of a hardcoded constant).
 *
 * <p>Two rules the frontend mock only enforces in the UI (a disabled button),
 * not the store action, are enforced here for real, per BACKEND_CONTRACT.md's
 * "business rules the API must enforce (not just the UI)":
 * <ul>
 *   <li>Loan eligibility (≥ N months of membership) — rejected with 403 if not met,
 *       not just discouraged by a disabled button.</li>
 *   <li>A guarantor-required loan (amount &gt; savings) must actually include a
 *       valid guarantorId — the frontend lets this submit with none.</li>
 *   <li>The guarantor-lock rule (a member actively guaranteeing someone else's
 *       loan can't apply for their own) — added in phase 6 alongside
 *       {@link GuaranteeService}, since it needs the guarantees table's
 *       accepted-status data to check.</li>
 * </ul>
 */
@Service
public class LoanApplicationService {

    private static final BigDecimal MIN_LOAN_AMOUNT_RWF = BigDecimal.valueOf(50_000);

    private final LoanRepository loanRepository;
    private final LoanTimelineEventRepository timelineRepository;
    private final GuaranteeRepository guaranteeRepository;
    private final MemberRepository memberRepository;
    private final OrganizationRepository organizationRepository;
    private final SavingsService savingsService;
    private final AuditService auditService;
    private final LoanDetailAssembler loanDetailAssembler;
    private final NotificationService notificationService;

    public LoanApplicationService(
            LoanRepository loanRepository,
            LoanTimelineEventRepository timelineRepository,
            GuaranteeRepository guaranteeRepository,
            MemberRepository memberRepository,
            OrganizationRepository organizationRepository,
            SavingsService savingsService,
            AuditService auditService,
            LoanDetailAssembler loanDetailAssembler,
            NotificationService notificationService) {
        this.loanRepository = loanRepository;
        this.timelineRepository = timelineRepository;
        this.guaranteeRepository = guaranteeRepository;
        this.memberRepository = memberRepository;
        this.organizationRepository = organizationRepository;
        this.savingsService = savingsService;
        this.auditService = auditService;
        this.loanDetailAssembler = loanDetailAssembler;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public LoanCalculationResponse calculate(UUID organizationId, UUID memberId, LoanCalculationRequest request) {
        Organization organization = requireOrganization(organizationId);
        AppUser member = requireMember(organizationId, memberId);
        BigDecimal savings = savingsService.currentBalance(organizationId, memberId);

        LoanCalculator.LoanCalculation calc = LoanCalculator.calculate(
                request.amount(), savings, request.periodMonths(),
                organization.getLoanInterestRate(), organization.getLoanInsuranceRate());

        int tenureMonths = monthsBetween(member.getDateJoined(), LocalDate.now());
        boolean eligible = tenureMonths >= organization.getMinMonthsBeforeEligible();
        return LoanCalculationResponse.from(calc, eligible, tenureMonths, organization.getMinMonthsBeforeEligible());
    }

    @Transactional
    public LoanDetailDto apply(UUID organizationId, UUID memberId, String memberName, ApplyLoanRequest request) {
        if (request.amount().compareTo(MIN_LOAN_AMOUNT_RWF) < 0) {
            throw new BadRequestException("Minimum loan amount is " + MIN_LOAN_AMOUNT_RWF + " RWF.");
        }

        Organization organization = requireOrganization(organizationId);
        if (!organization.getAllowedRepaymentPeriods().contains(request.periodMonths())) {
            throw new BadRequestException("This organization does not offer a "
                    + request.periodMonths() + "-month repayment period.");
        }

        AppUser member = requireMember(organizationId, memberId);
        int tenureMonths = monthsBetween(member.getDateJoined(), LocalDate.now());
        if (tenureMonths < organization.getMinMonthsBeforeEligible()) {
            throw new ForbiddenException("Members become eligible for a loan after "
                    + organization.getMinMonthsBeforeEligible() + " months of continuous savings. "
                    + "You've been saving for " + tenureMonths + " month(s).");
        }

        // Guarantor lock (phase 6, BACKEND_CONTRACT.md): a member actively
        // guaranteeing someone else's loan can't apply for one of their own
        // until that guarantee is released.
        if (guaranteeRepository.existsByOrganizationIdAndGuarantorIdAndStatus(
                organizationId, memberId, GuaranteeStatus.accepted)) {
            throw new ForbiddenException("You are currently guaranteeing another member's loan and cannot "
                    + "apply for a new loan until that guarantee is released.");
        }

        BigDecimal savings = savingsService.currentBalance(organizationId, memberId);
        LoanCalculator.LoanCalculation calc = LoanCalculator.calculate(
                request.amount(), savings, request.periodMonths(),
                organization.getLoanInterestRate(), organization.getLoanInsuranceRate());

        AppUser guarantor = null;
        if (calc.guarantorRequired()) {
            if (request.guarantorId() == null) {
                throw new BadRequestException(
                        "This loan amount exceeds your savings — a guarantor is required.");
            }
            if (request.guarantorId().equals(memberId)) {
                throw new BadRequestException("You cannot guarantee your own loan.");
            }
            guarantor = memberRepository.findByIdAndOrganizationId(request.guarantorId(), organizationId)
                    .orElseThrow(() -> new NotFoundException("Guarantor not found."));
        }

        int riskScore = LoanCalculator.riskScore(
                request.amount(), savings, tenureMonths, calc.guarantorRequired(),
                member.getMonthlySalaryRwf(), calc.monthlyInstallment(),
                organization.getMinMonthsBeforeEligible());

        Loan loan = createWithUniqueContractNumber(organization, memberId, request, calc, riskScore);

        timelineRepository.save(new LoanTimelineEvent(
                loan.getId(), LoanStatus.SUBMITTED, memberName, "Loan application submitted for review."));

        if (guarantor != null) {
            guaranteeRepository.save(new Guarantee(
                    organizationId, loan.getId(), memberId, guarantor.getId(), request.amount()));
        }

        auditService.record(organizationId, memberId, memberName, "Applied for loan", loan.getContractNumber());

        notificationService.notify(memberId, NotificationType.loan, "Loan application submitted",
                "Your loan application " + loan.getContractNumber() + " has been submitted and is awaiting review.");
        if (guarantor != null) {
            notificationService.notify(guarantor.getId(), NotificationType.loan, "You've been requested as a guarantor",
                    memberName + " has requested you as a guarantor for a " + formatRwf(request.amount()) + " RWF loan.");
        }

        return loanDetailAssembler.toDetail(loan);
    }

    @Transactional(readOnly = true)
    public Page<LoanSummaryDto> list(UUID organizationId, UUID memberIdFilter, Pageable pageable) {
        Page<Loan> page = memberIdFilter == null
                ? loanRepository.findAllByOrganizationIdOrderByCreatedAtDesc(organizationId, pageable)
                : loanRepository.findAllByOrganizationIdAndMemberIdOrderByCreatedAtDesc(
                        organizationId, memberIdFilter, pageable);
        return page.map(LoanSummaryDto::from);
    }

    @Transactional(readOnly = true)
    public LoanDetailDto get(UUID organizationId, UUID loanId) {
        Loan loan = loanRepository.findByIdAndOrganizationId(loanId, organizationId)
                .orElseThrow(() -> new NotFoundException("Loan not found."));
        return loanDetailAssembler.toDetail(loan);
    }

    /**
     * Contract numbers are {org logo initials}-{year}-{sequence}. The
     * sequence is derived from a row count, which is race-prone under truly
     * concurrent applications for the same organization — retried a few
     * times against the table's UNIQUE constraint rather than adding a
     * dedicated sequence table for what's a low-frequency operation for a
     * SACCO-sized organization.
     */
    private Loan createWithUniqueContractNumber(
            Organization organization, UUID memberId, ApplyLoanRequest request,
            LoanCalculator.LoanCalculation calc, int riskScore) {
        int year = LocalDate.now().getYear();
        long baseSequence = loanRepository.countByOrganizationId(organization.getId()) + 1;

        for (int attempt = 0; attempt < 5; attempt++) {
            String contractNumber = "%s-%d-%03d".formatted(
                    organization.getLogoInitials(), year, baseSequence + attempt);
            try {
                Loan loan = new Loan(
                        organization.getId(), contractNumber, memberId, request.amount(), request.purpose(),
                        request.periodMonths(), organization.getLoanInterestRate(), calc.guarantorRequired(),
                        calc.insuranceFee(), calc.monthlyInstallment(), calc.totalPayable(), riskScore);
                return loanRepository.saveAndFlush(loan);
            } catch (DataIntegrityViolationException e) {
                // Contract number collision — retry with the next candidate.
            }
        }
        throw new IllegalStateException("Could not generate a unique contract number after 5 attempts.");
    }

    private static String formatRwf(BigDecimal amount) {
        return NumberFormat.getIntegerInstance(Locale.US).format(amount);
    }

    /** Same whole-calendar-month math as src/lib/mock-data/financials.ts's monthsBetween. */
    private static int monthsBetween(LocalDate from, LocalDate to) {
        Period period = Period.between(from.withDayOfMonth(1), to.withDayOfMonth(1));
        return period.getYears() * 12 + period.getMonths();
    }

    private Organization requireOrganization(UUID organizationId) {
        return organizationRepository.findById(organizationId)
                .orElseThrow(() -> new NotFoundException("Organization not found."));
    }

    private AppUser requireMember(UUID organizationId, UUID memberId) {
        return memberRepository.findByIdAndOrganizationId(memberId, organizationId)
                .orElseThrow(() -> new NotFoundException("Member not found."));
    }
}
