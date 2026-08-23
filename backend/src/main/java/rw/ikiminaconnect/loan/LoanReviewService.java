package rw.ikiminaconnect.loan;

import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rw.ikiminaconnect.audit.AuditService;
import rw.ikiminaconnect.common.ConflictException;
import rw.ikiminaconnect.common.ForbiddenException;
import rw.ikiminaconnect.common.NotFoundException;
import rw.ikiminaconnect.member.AppUser;
import rw.ikiminaconnect.member.MemberRepository;

/**
 * Loan Committee review (roadmap phase 7). Ports data-store.ts's
 * startLoanReview and committeeDecision exactly for the status transitions
 * and timeline notes.
 *
 * <p>This is where the committee-chair-only rule (confirmed real APUPEKA
 * rule, documented since the vertical-slice plan but not implemented until
 * now) actually gets enforced: a self-covered loan (no guarantor required)
 * can be decided by any Loan Committee member, but a guaranteed loan can
 * only be decided by the Committee Chair. The frontend mock never enforced
 * this — every loan-committee user saw the same Approve/Reject buttons
 * regardless of chair status (confirmed by reading PendingDetail.tsx).
 *
 * <p>Chair status is re-read from the database on every decision, not
 * trusted from the (up to 15-minute-old) JWT claim — chair status can change
 * between token issuance and this call, and a stale "yes" would be a real
 * privilege-escalation window on the single most sensitive approval in the
 * system.
 */
@Service
public class LoanReviewService {

    private final LoanRepository loanRepository;
    private final LoanTimelineEventRepository timelineRepository;
    private final MemberRepository memberRepository;
    private final AuditService auditService;
    private final LoanDetailAssembler loanDetailAssembler;

    public LoanReviewService(
            LoanRepository loanRepository,
            LoanTimelineEventRepository timelineRepository,
            MemberRepository memberRepository,
            AuditService auditService,
            LoanDetailAssembler loanDetailAssembler) {
        this.loanRepository = loanRepository;
        this.timelineRepository = timelineRepository;
        this.memberRepository = memberRepository;
        this.auditService = auditService;
        this.loanDetailAssembler = loanDetailAssembler;
    }

    @Transactional
    public LoanDetailDto startReview(UUID organizationId, UUID loanId, UUID actorId, String actorName) {
        Loan loan = requireLoan(organizationId, loanId);
        if (loan.getStatus() != LoanStatus.SUBMITTED && loan.getStatus() != LoanStatus.UNDER_REVIEW) {
            throw new ConflictException("This loan is not awaiting review (status: "
                    + loan.getStatus().toValue() + ").");
        }

        timelineRepository.save(new LoanTimelineEvent(loan.getId(), LoanStatus.UNDER_REVIEW, actorName,
                "Application reviewed against membership and savings records."));

        if (loan.isInsuranceRequired()) {
            loan.moveToGuarantorApproval();
            timelineRepository.save(new LoanTimelineEvent(
                    loan.getId(), LoanStatus.GUARANTOR_APPROVAL, actorName, "Awaiting guarantor response."));
        } else {
            loan.forwardToCommitteeReview();
            timelineRepository.save(new LoanTimelineEvent(
                    loan.getId(), LoanStatus.COMMITTEE_REVIEW, actorName, "Forwarded to Loan Committee for review."));
        }

        auditService.record(organizationId, actorId, actorName, "Started loan review", loan.getContractNumber());
        return loanDetailAssembler.toDetail(loan);
    }

    @Transactional
    public LoanDetailDto decide(
            UUID organizationId, UUID loanId, UUID actorId, String actorName, CommitteeDecisionRequest request) {
        Loan loan = requireLoan(organizationId, loanId);
        if (loan.getStatus() != LoanStatus.COMMITTEE_REVIEW) {
            throw new ConflictException("This loan is not awaiting a committee decision (status: "
                    + loan.getStatus().toValue() + ").");
        }

        if (loan.isInsuranceRequired()) {
            AppUser decidingUser = memberRepository.findByIdAndOrganizationId(actorId, organizationId)
                    .orElseThrow(() -> new NotFoundException("Member not found."));
            if (!decidingUser.isCommitteeChair()) {
                throw new ForbiddenException("This loan required a guarantor, so only the Loan Committee "
                        + "Chair can make the final decision.");
            }
        }

        if (request.approve()) {
            loan.approve(blankToDefault(request.notes(), "Approved by Loan Committee."));
            timelineRepository.save(new LoanTimelineEvent(
                    loan.getId(), LoanStatus.APPROVED, actorName, loan.getCommitteeNotes()));
            auditService.record(organizationId, actorId, actorName, "Approved loan", loan.getContractNumber());
        } else {
            loan.rejectByCommittee(blankToDefault(request.notes(), "Rejected by Loan Committee."));
            timelineRepository.save(new LoanTimelineEvent(
                    loan.getId(), LoanStatus.REJECTED, actorName, loan.getCommitteeNotes()));
            auditService.record(organizationId, actorId, actorName, "Rejected loan", loan.getContractNumber());
        }

        return loanDetailAssembler.toDetail(loan);
    }

    private static String blankToDefault(String notes, String fallback) {
        return (notes == null || notes.isBlank()) ? fallback : notes;
    }

    private Loan requireLoan(UUID organizationId, UUID loanId) {
        return loanRepository.findByIdAndOrganizationId(loanId, organizationId)
                .orElseThrow(() -> new NotFoundException("Loan not found."));
    }
}
