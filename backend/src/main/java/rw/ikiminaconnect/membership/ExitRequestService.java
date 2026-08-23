package rw.ikiminaconnect.membership;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rw.ikiminaconnect.audit.AuditService;
import rw.ikiminaconnect.common.ConflictException;
import rw.ikiminaconnect.common.NotFoundException;
import rw.ikiminaconnect.loan.Guarantee;
import rw.ikiminaconnect.loan.GuaranteeRepository;
import rw.ikiminaconnect.loan.GuaranteeStatus;
import rw.ikiminaconnect.loan.Loan;
import rw.ikiminaconnect.loan.LoanRepository;
import rw.ikiminaconnect.loan.LoanStatus;
import rw.ikiminaconnect.member.AppUser;
import rw.ikiminaconnect.member.MemberRepository;

/**
 * Member-initiated exit requests, with staff approval — remaining phase-13
 * scope. Ports data-store.ts's requestExit/decideExitRequest/exitEligibility
 * exactly, including one deliberate correction: BACKEND_CONTRACT.md's
 * business-rules section describes "outstanding loan" as any of a long list
 * of statuses (submitted, under-review, ...), but the actual mock code
 * (OUTSTANDING_LOAN_STATUSES) only checks DISBURSED/REPAYING — a loan that
 * hasn't been disbursed yet isn't real financial exposure blocking exit.
 * Ported the real code, not the more conservative doc description.
 *
 * <p>Added beyond the frontend mock: submitting a second exit request while
 * one is already pending is rejected (409) — the mock's own UI disables the
 * button for this case but never enforces it server-side.
 */
@Service
public class ExitRequestService {

    private static final List<LoanStatus> OUTSTANDING_LOAN_STATUSES = List.of(LoanStatus.DISBURSED, LoanStatus.REPAYING);

    private final ExitRequestRepository exitRequestRepository;
    private final LoanRepository loanRepository;
    private final GuaranteeRepository guaranteeRepository;
    private final MemberRepository memberRepository;
    private final AuditService auditService;

    public ExitRequestService(
            ExitRequestRepository exitRequestRepository,
            LoanRepository loanRepository,
            GuaranteeRepository guaranteeRepository,
            MemberRepository memberRepository,
            AuditService auditService) {
        this.exitRequestRepository = exitRequestRepository;
        this.loanRepository = loanRepository;
        this.guaranteeRepository = guaranteeRepository;
        this.memberRepository = memberRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<ExitRequestDto> list(UUID organizationId) {
        return exitRequestRepository.findAllByOrganizationIdOrderByRequestedDateDesc(organizationId).stream()
                .map(ExitRequestDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public ExitEligibilityDto eligibility(UUID organizationId, UUID memberId) {
        List<Loan> outstandingLoans = loanRepository.findAllByOrganizationIdAndMemberIdAndStatusIn(
                organizationId, memberId, OUTSTANDING_LOAN_STATUSES);

        List<Guarantee> guarantees = guaranteeRepository.findAllByOrganizationIdAndGuarantorIdAndStatus(
                organizationId, memberId, GuaranteeStatus.accepted);
        List<String> activeGuaranteeLoans = guarantees.stream()
                .map(g -> loanRepository.findByIdAndOrganizationId(g.getLoanId(), organizationId).orElse(null))
                .filter(loan -> loan != null && loan.getStatus() != LoanStatus.COMPLETED && loan.getStatus() != LoanStatus.REJECTED)
                .map(Loan::getContractNumber)
                .toList();

        List<String> outstandingLoanNumbers = outstandingLoans.stream().map(Loan::getContractNumber).toList();

        return new ExitEligibilityDto(
                outstandingLoanNumbers.isEmpty() && activeGuaranteeLoans.isEmpty(),
                outstandingLoanNumbers, activeGuaranteeLoans);
    }

    @Transactional
    public ExitRequestDto submit(UUID organizationId, UUID memberId, CreateExitRequest request, String actorName) {
        if (exitRequestRepository.existsByOrganizationIdAndMemberIdAndStatus(
                organizationId, memberId, RequestStatus.pending)) {
            throw new ConflictException("You already have a pending exit request.");
        }
        ExitRequest exitRequest = new ExitRequest(organizationId, memberId, request.reason());
        exitRequest = exitRequestRepository.save(exitRequest);
        auditService.record(organizationId, memberId, actorName, "Requested membership exit", request.reason());
        return ExitRequestDto.from(exitRequest);
    }

    @Transactional
    public ExitRequestDto decide(
            UUID organizationId, UUID requestId, DecisionRequest request, UUID actorId, String actorName) {
        ExitRequest exitRequest = exitRequestRepository.findByIdAndOrganizationId(requestId, organizationId)
                .orElseThrow(() -> new NotFoundException("Exit request not found."));
        if (exitRequest.getStatus() != RequestStatus.pending) {
            throw new ConflictException("This exit request has already been decided.");
        }

        if (request.decision() == Decision.approve) {
            ExitEligibilityDto eligibility = eligibility(organizationId, exitRequest.getMemberId());
            if (!eligibility.eligible()) {
                throw new ConflictException(
                        "This member is not eligible to exit — they have an outstanding loan or an active guarantee.");
            }
            AppUser member = memberRepository.findByIdAndOrganizationId(exitRequest.getMemberId(), organizationId)
                    .orElseThrow(() -> new NotFoundException("Member not found."));
            member.exit();
        }

        exitRequest.decide(request.decision(), actorName);
        auditService.record(organizationId, actorId, actorName,
                request.decision() == Decision.approve ? "Approved membership exit" : "Rejected membership exit",
                exitRequest.getMemberId().toString());
        return ExitRequestDto.from(exitRequest);
    }
}
