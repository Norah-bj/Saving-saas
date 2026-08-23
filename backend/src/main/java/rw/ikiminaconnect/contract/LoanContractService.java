package rw.ikiminaconnect.contract;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rw.ikiminaconnect.audit.AuditService;
import rw.ikiminaconnect.common.ConflictException;
import rw.ikiminaconnect.common.NotFoundException;
import rw.ikiminaconnect.loan.Guarantee;
import rw.ikiminaconnect.loan.GuaranteeRepository;
import rw.ikiminaconnect.loan.Loan;
import rw.ikiminaconnect.loan.LoanDetailAssembler;
import rw.ikiminaconnect.loan.LoanDetailDto;
import rw.ikiminaconnect.loan.LoanRepository;
import rw.ikiminaconnect.loan.LoanStatus;
import rw.ikiminaconnect.loan.LoanTimelineEvent;
import rw.ikiminaconnect.loan.LoanTimelineEventRepository;
import rw.ikiminaconnect.member.AppUser;
import rw.ikiminaconnect.member.MemberRepository;
import rw.ikiminaconnect.organization.Organization;
import rw.ikiminaconnect.organization.OrganizationRepository;
import rw.ikiminaconnect.savings.SavingsService;

/**
 * Loan contracts (roadmap phase 8). Ports data-store.ts's generateContract
 * for the status transition; the PDF itself replaces the frontend's
 * print-styled HTML page (see LoanContractPdfGenerator).
 */
@Service
public class LoanContractService {

    private final LoanRepository loanRepository;
    private final LoanTimelineEventRepository timelineRepository;
    private final GuaranteeRepository guaranteeRepository;
    private final MemberRepository memberRepository;
    private final OrganizationRepository organizationRepository;
    private final SavingsService savingsService;
    private final AuditService auditService;
    private final LoanDetailAssembler loanDetailAssembler;
    private final LoanContractPdfGenerator pdfGenerator;

    public LoanContractService(
            LoanRepository loanRepository,
            LoanTimelineEventRepository timelineRepository,
            GuaranteeRepository guaranteeRepository,
            MemberRepository memberRepository,
            OrganizationRepository organizationRepository,
            SavingsService savingsService,
            AuditService auditService,
            LoanDetailAssembler loanDetailAssembler,
            LoanContractPdfGenerator pdfGenerator) {
        this.loanRepository = loanRepository;
        this.timelineRepository = timelineRepository;
        this.guaranteeRepository = guaranteeRepository;
        this.memberRepository = memberRepository;
        this.organizationRepository = organizationRepository;
        this.savingsService = savingsService;
        this.auditService = auditService;
        this.loanDetailAssembler = loanDetailAssembler;
        this.pdfGenerator = pdfGenerator;
    }

    @Transactional
    public LoanDetailDto generate(UUID organizationId, UUID loanId, UUID actorId, String actorName) {
        Loan loan = requireLoan(organizationId, loanId);
        if (loan.getStatus() != LoanStatus.APPROVED) {
            throw new ConflictException("This loan is not approved yet (status: " + loan.getStatus().toValue() + ").");
        }

        loan.markContractGenerated();
        timelineRepository.save(new LoanTimelineEvent(
                loan.getId(), LoanStatus.CONTRACT_GENERATED, actorName, "Loan agreement generated."));
        auditService.record(organizationId, actorId, actorName, "Generated loan contract", loan.getContractNumber());

        return loanDetailAssembler.toDetail(loan);
    }

    /**
     * Renders the contract PDF on demand from current data — matches the
     * frontend's LoanContract.tsx, which is always a live view, not a stored
     * snapshot. No status gate: the real page lets staff preview a contract
     * for an approved-but-not-yet-generated loan too (readyForContract in
     * Disbursement.tsx shows a Preview link alongside Generate Contract).
     */
    @Transactional(readOnly = true)
    public byte[] renderPdf(UUID organizationId, UUID loanId) {
        Loan loan = requireLoan(organizationId, loanId);
        AppUser member = memberRepository.findByIdAndOrganizationId(loan.getMemberId(), organizationId)
                .orElseThrow(() -> new NotFoundException("Member not found."));
        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new NotFoundException("Organization not found."));
        BigDecimal savings = savingsService.currentBalance(organizationId, loan.getMemberId());

        List<GuarantorInfo> guarantors = guaranteeRepository.findAllByLoanId(loan.getId()).stream()
                .map(g -> toGuarantorInfo(organizationId, g))
                .filter(g -> g != null)
                .toList();

        return pdfGenerator.generate(loan, member, organization, guarantors, savings);
    }

    private GuarantorInfo toGuarantorInfo(UUID organizationId, Guarantee guarantee) {
        return memberRepository.findByIdAndOrganizationId(guarantee.getGuarantorId(), organizationId)
                .map(g -> new GuarantorInfo(g.getFullName(), g.getNationalId(), g.getPhone(), guarantee.getAmountGuaranteed()))
                .orElse(null);
    }

    private Loan requireLoan(UUID organizationId, UUID loanId) {
        return loanRepository.findByIdAndOrganizationId(loanId, organizationId)
                .orElseThrow(() -> new NotFoundException("Loan not found."));
    }
}
