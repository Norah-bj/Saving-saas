package rw.ikiminaconnect.loan;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rw.ikiminaconnect.audit.AuditService;
import rw.ikiminaconnect.common.ConflictException;
import rw.ikiminaconnect.common.ForbiddenException;
import rw.ikiminaconnect.common.NotFoundException;
import rw.ikiminaconnect.member.AppUser;
import rw.ikiminaconnect.member.MemberRepository;
import rw.ikiminaconnect.notification.NotificationService;
import rw.ikiminaconnect.notification.NotificationType;

/**
 * Guarantor-side workflow (roadmap phase 6): responding to guarantee
 * requests, and the guarantor-lock rule. Ports src/lib/store/data-store.ts's
 * respondGuarantee exactly — accepting forwards the loan straight to
 * committee-review, declining rejects the loan outright with "Guarantor
 * declined the request." as the committee notes. Creating a guarantee
 * happens in phase 5 (LoanApplicationService), not here.
 */
@Service
public class GuaranteeService {

    private final GuaranteeRepository guaranteeRepository;
    private final LoanRepository loanRepository;
    private final LoanTimelineEventRepository timelineRepository;
    private final MemberRepository memberRepository;
    private final AuditService auditService;
    private final NotificationService notificationService;

    public GuaranteeService(
            GuaranteeRepository guaranteeRepository,
            LoanRepository loanRepository,
            LoanTimelineEventRepository timelineRepository,
            MemberRepository memberRepository,
            AuditService auditService,
            NotificationService notificationService) {
        this.guaranteeRepository = guaranteeRepository;
        this.loanRepository = loanRepository;
        this.timelineRepository = timelineRepository;
        this.memberRepository = memberRepository;
        this.auditService = auditService;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public List<GuaranteeDto> myGuarantees(UUID organizationId, UUID guarantorId) {
        return guaranteeRepository
                .findAllByOrganizationIdAndGuarantorIdOrderByRequestedDateDesc(organizationId, guarantorId)
                .stream()
                .map(g -> toDto(g, loanRepository.findByIdAndOrganizationId(g.getLoanId(), organizationId)
                        .orElseThrow(() -> new NotFoundException("Loan not found."))))
                .toList();
    }

    @Transactional
    public GuaranteeDto respond(UUID organizationId, UUID guaranteeId, UUID guarantorId, boolean accept, String actorName) {
        Guarantee guarantee = guaranteeRepository.findByIdAndOrganizationId(guaranteeId, organizationId)
                .orElseThrow(() -> new NotFoundException("Guarantee request not found."));

        if (!guarantee.getGuarantorId().equals(guarantorId)) {
            throw new ForbiddenException("This guarantee request wasn't addressed to you.");
        }
        if (guarantee.getStatus() != GuaranteeStatus.pending) {
            throw new ConflictException("This guarantee request has already been responded to.");
        }

        Loan loan = loanRepository.findByIdAndOrganizationId(guarantee.getLoanId(), organizationId)
                .orElseThrow(() -> new NotFoundException("Loan not found."));

        if (accept) {
            guarantee.accept();
            loan.forwardToCommitteeReview();
            timelineRepository.save(new LoanTimelineEvent(
                    loan.getId(), LoanStatus.GUARANTOR_APPROVAL, actorName, "Guarantor accepted the request."));
            timelineRepository.save(new LoanTimelineEvent(
                    loan.getId(), LoanStatus.COMMITTEE_REVIEW, actorName, "Forwarded to Loan Committee for review."));
        } else {
            guarantee.reject();
            loan.rejectByGuarantorDecline();
            timelineRepository.save(new LoanTimelineEvent(
                    loan.getId(), LoanStatus.REJECTED, actorName, "Guarantor declined the request."));
        }

        auditService.record(organizationId, guarantorId, actorName,
                accept ? "Accepted guarantee request" : "Declined guarantee request", loan.getId().toString());

        notificationService.notify(guarantee.getBorrowerId(), NotificationType.loan,
                accept ? "Guarantor accepted your request" : "Guarantor declined your request",
                actorName + " has " + (accept ? "accepted" : "declined") + " your guarantee request for loan "
                        + loan.getContractNumber() + ".");

        return toDto(guarantee, loan);
    }

    private GuaranteeDto toDto(Guarantee guarantee, Loan loan) {
        AppUser borrower = memberRepository.findByIdAndOrganizationId(guarantee.getBorrowerId(), loan.getOrganizationId())
                .orElse(null);
        return new GuaranteeDto(
                guarantee.getId(), loan.getId(), loan.getContractNumber(), loan.getRemainingBalance(),
                guarantee.getBorrowerId(), borrower == null ? "Unknown member" : borrower.getFullName(),
                guarantee.getAmountGuaranteed(), guarantee.getStatus(),
                guarantee.getRequestedDate(), guarantee.getRespondedDate());
    }
}
