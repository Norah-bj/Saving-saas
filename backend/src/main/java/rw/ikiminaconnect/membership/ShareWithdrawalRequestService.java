package rw.ikiminaconnect.membership;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rw.ikiminaconnect.audit.AuditService;
import rw.ikiminaconnect.common.ConflictException;
import rw.ikiminaconnect.common.NotFoundException;
import rw.ikiminaconnect.organization.Organization;
import rw.ikiminaconnect.organization.OrganizationRepository;
import rw.ikiminaconnect.savings.SavingsService;
import rw.ikiminaconnect.savings.ShareHoldingRepository;

/**
 * Member-initiated share-withdrawal requests, with staff approval —
 * remaining phase-13 scope. The frontend mock's decideShareWithdrawal never
 * actually touches share_holdings or savings_transactions on approval (it
 * only flips the request's status) — that's a real gap, not a business rule
 * to preserve, so approval here genuinely moves the shares and money via
 * {@link SavingsService#withdrawShares}. Sufficiency (requested shares <=
 * held shares) is validated both at submission and again at approval —
 * neither is checked at all in the mock, which only disables its own submit
 * button client-side.
 */
@Service
public class ShareWithdrawalRequestService {

    private final ShareWithdrawalRequestRepository shareWithdrawalRequestRepository;
    private final ShareHoldingRepository shareHoldingRepository;
    private final OrganizationRepository organizationRepository;
    private final SavingsService savingsService;
    private final AuditService auditService;

    public ShareWithdrawalRequestService(
            ShareWithdrawalRequestRepository shareWithdrawalRequestRepository,
            ShareHoldingRepository shareHoldingRepository,
            OrganizationRepository organizationRepository,
            SavingsService savingsService,
            AuditService auditService) {
        this.shareWithdrawalRequestRepository = shareWithdrawalRequestRepository;
        this.shareHoldingRepository = shareHoldingRepository;
        this.organizationRepository = organizationRepository;
        this.savingsService = savingsService;
        this.auditService = auditService;
    }

    /** Staff see every request in the org; a plain member sees only their own. */
    @Transactional(readOnly = true)
    public List<ShareWithdrawalRequestDto> list(UUID organizationId, UUID callerId, boolean isStaff) {
        List<ShareWithdrawalRequest> requests = isStaff
                ? shareWithdrawalRequestRepository.findAllByOrganizationIdOrderByRequestedDateDesc(organizationId)
                : shareWithdrawalRequestRepository.findAllByOrganizationIdAndMemberIdOrderByRequestedDateDesc(
                        organizationId, callerId);
        return requests.stream().map(ShareWithdrawalRequestDto::from).toList();
    }

    @Transactional
    public ShareWithdrawalRequestDto submit(
            UUID organizationId, UUID memberId, CreateShareWithdrawalRequest request, String actorName) {
        int heldShares = shareHoldingRepository.findByMemberIdAndOrganizationId(memberId, organizationId)
                .map(h -> h.getTotalShares())
                .orElse(0);
        if (request.shares() > heldShares) {
            throw new ConflictException("You only hold " + heldShares + " shares.");
        }

        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new NotFoundException("Organization not found."));
        BigDecimal amount = organization.getShareValueRwf().multiply(BigDecimal.valueOf(request.shares()));

        ShareWithdrawalRequest withdrawalRequest = new ShareWithdrawalRequest(organizationId, memberId, request.shares(), amount);
        withdrawalRequest = shareWithdrawalRequestRepository.save(withdrawalRequest);
        auditService.record(organizationId, memberId, actorName,
                "Requested withdrawal of " + request.shares() + " shares", memberId.toString());
        return ShareWithdrawalRequestDto.from(withdrawalRequest);
    }

    @Transactional
    public ShareWithdrawalRequestDto decide(
            UUID organizationId, UUID requestId, DecisionRequest request, UUID actorId, String actorName) {
        ShareWithdrawalRequest withdrawalRequest = shareWithdrawalRequestRepository
                .findByIdAndOrganizationId(requestId, organizationId)
                .orElseThrow(() -> new NotFoundException("Share withdrawal request not found."));
        if (withdrawalRequest.getStatus() != RequestStatus.pending) {
            throw new ConflictException("This share withdrawal request has already been decided.");
        }

        if (request.decision() == Decision.approve) {
            savingsService.withdrawShares(
                    organizationId, withdrawalRequest.getMemberId(), withdrawalRequest.getShares(), actorId, actorName);
        }

        withdrawalRequest.decide(request.decision(), actorName);
        auditService.record(organizationId, actorId, actorName,
                request.decision() == Decision.approve ? "Approved share withdrawal" : "Rejected share withdrawal",
                withdrawalRequest.getMemberId().toString());
        return ShareWithdrawalRequestDto.from(withdrawalRequest);
    }
}
