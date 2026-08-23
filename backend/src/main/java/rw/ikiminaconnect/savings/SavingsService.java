package rw.ikiminaconnect.savings;

import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rw.ikiminaconnect.audit.AuditService;
import rw.ikiminaconnect.common.NotFoundException;
import rw.ikiminaconnect.member.AppUser;
import rw.ikiminaconnect.member.MemberRepository;
import rw.ikiminaconnect.organization.Organization;
import rw.ikiminaconnect.organization.OrganizationRepository;
import rw.ikiminaconnect.tenant.OrganizationFilterInterceptor;

@Service
public class SavingsService {

    private final SavingsTransactionRepository savingsTransactionRepository;
    private final ShareHoldingRepository shareHoldingRepository;
    private final MemberRepository memberRepository;
    private final OrganizationRepository organizationRepository;
    private final AuditService auditService;
    private final OrganizationFilterInterceptor organizationFilterInterceptor;
    private final EntityManager entityManager;

    public SavingsService(
            SavingsTransactionRepository savingsTransactionRepository,
            ShareHoldingRepository shareHoldingRepository,
            MemberRepository memberRepository,
            OrganizationRepository organizationRepository,
            AuditService auditService,
            OrganizationFilterInterceptor organizationFilterInterceptor,
            EntityManager entityManager) {
        this.savingsTransactionRepository = savingsTransactionRepository;
        this.shareHoldingRepository = shareHoldingRepository;
        this.memberRepository = memberRepository;
        this.organizationRepository = organizationRepository;
        this.auditService = auditService;
        this.organizationFilterInterceptor = organizationFilterInterceptor;
        this.entityManager = entityManager;
    }

    @Transactional(readOnly = true)
    public BigDecimal currentBalance(UUID organizationId, UUID memberId) {
        return savingsTransactionRepository
                .findAllByOrganizationIdAndMemberIdOrderByCreatedAtDesc(organizationId, memberId, Pageable.ofSize(1))
                .stream()
                .findFirst()
                .map(SavingsTransaction::getBalanceAfter)
                .orElse(BigDecimal.ZERO);
    }

    @Transactional(readOnly = true)
    public SavingsLedgerResponse ledger(UUID organizationId, UUID memberId, Pageable pageable) {
        // Reference usage of the Hibernate-filter defense-in-depth layer — see
        // OrganizationFilterInterceptor's javadoc. The real guarantee here is
        // still that the repository call below takes organizationId explicitly.
        organizationFilterInterceptor.apply(entityManager);

        requireMember(organizationId, memberId);
        Page<SavingsTransaction> page = savingsTransactionRepository
                .findAllByOrganizationIdAndMemberIdOrderByCreatedAtDesc(organizationId, memberId, pageable);
        return SavingsLedgerResponse.from(page, currentBalance(organizationId, memberId));
    }

    @Transactional
    public SavingsTransactionDto addVoluntarySaving(
            UUID organizationId, UUID memberId, VoluntarySavingRequest request, UUID actorId, String actorName) {
        requireMember(organizationId, memberId);

        // Locks the member's latest ledger row so a concurrent write for the
        // same member can't read the same stale balance — see the repository
        // method's javadoc.
        BigDecimal previousBalance = savingsTransactionRepository
                .findFirstByOrganizationIdAndMemberIdOrderByCreatedAtDesc(organizationId, memberId)
                .map(SavingsTransaction::getBalanceAfter)
                .orElse(BigDecimal.ZERO);

        BigDecimal newBalance = previousBalance.add(request.amountRwf());
        SavingsTransaction tx = new SavingsTransaction(
                organizationId, memberId, SavingsTxType.VOLUNTARY, request.amountRwf(),
                newBalance, "Voluntary savings top-up", request.source());
        savingsTransactionRepository.save(tx);

        auditService.record(organizationId, actorId, actorName, "Added voluntary saving", memberId.toString());
        return SavingsTransactionDto.from(tx);
    }

    @Transactional
    public BuySharesResponse buyShares(
            UUID organizationId, UUID memberId, BuySharesRequest request, UUID actorId, String actorName) {
        requireMember(organizationId, memberId);

        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new NotFoundException("Organization not found."));
        BigDecimal shareValue = organization.getShareValueRwf();
        BigDecimal amount = shareValue.multiply(BigDecimal.valueOf(request.shares()));

        BigDecimal previousBalance = savingsTransactionRepository
                .findFirstByOrganizationIdAndMemberIdOrderByCreatedAtDesc(organizationId, memberId)
                .map(SavingsTransaction::getBalanceAfter)
                .orElse(BigDecimal.ZERO);
        BigDecimal newBalance = previousBalance.add(amount);

        SavingsTransaction tx = new SavingsTransaction(
                organizationId, memberId, SavingsTxType.SHARE_PURCHASE, amount, newBalance,
                "Purchase of " + request.shares() + " shares", "Member Self-Service");
        savingsTransactionRepository.save(tx);

        ShareHolding holding = shareHoldingRepository.findByMemberIdAndOrganizationId(memberId, organizationId)
                .orElseGet(() -> new ShareHolding(memberId, organizationId));
        holding.addShares(request.shares());
        shareHoldingRepository.save(holding);

        auditService.record(organizationId, actorId, actorName,
                "Purchased " + request.shares() + " shares", memberId.toString());

        BigDecimal totalValue = shareValue.multiply(BigDecimal.valueOf(holding.getTotalShares()));
        return new BuySharesResponse(
                memberId, holding.getTotalShares(), shareValue, totalValue, SavingsTransactionDto.from(tx));
    }

    /**
     * Reverses {@link #buyShares} — reduces the member's share count and
     * records a matching {@code WITHDRAWAL} savings transaction that
     * decreases their running balance, symmetric with how a share purchase
     * increases it. Used by {@code membership.ShareWithdrawalRequestService}
     * on approval of a share-withdrawal request. Throws
     * {@code IllegalStateException} (via {@link ShareHolding#removeShares})
     * if the member no longer holds enough shares — the caller is expected
     * to have already validated this at request-submission time too, this
     * is the defensive re-check at approval time.
     */
    @Transactional
    public SavingsTransactionDto withdrawShares(
            UUID organizationId, UUID memberId, int shares, UUID actorId, String actorName) {
        requireMember(organizationId, memberId);

        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new NotFoundException("Organization not found."));
        BigDecimal shareValue = organization.getShareValueRwf();
        BigDecimal amount = shareValue.multiply(BigDecimal.valueOf(shares));

        ShareHolding holding = shareHoldingRepository.findByMemberIdAndOrganizationId(memberId, organizationId)
                .orElseGet(() -> new ShareHolding(memberId, organizationId));
        holding.removeShares(shares);
        shareHoldingRepository.save(holding);

        BigDecimal previousBalance = savingsTransactionRepository
                .findFirstByOrganizationIdAndMemberIdOrderByCreatedAtDesc(organizationId, memberId)
                .map(SavingsTransaction::getBalanceAfter)
                .orElse(BigDecimal.ZERO);
        BigDecimal newBalance = previousBalance.subtract(amount);

        SavingsTransaction tx = new SavingsTransaction(
                organizationId, memberId, SavingsTxType.WITHDRAWAL, amount, newBalance,
                "Withdrawal of " + shares + " shares", "Share Withdrawal Approval");
        savingsTransactionRepository.save(tx);

        auditService.record(organizationId, actorId, actorName,
                "Withdrew " + shares + " shares", memberId.toString());
        return SavingsTransactionDto.from(tx);
    }

    /**
     * Generic append-to-ledger used by callers that have already validated
     * the member and computed the amount themselves — currently just
     * {@code PayrollImportService} for salary-deduction rows. Shares the same
     * row-locking as {@link #addVoluntarySaving} so a payroll import and a
     * concurrent member self-service action for the same member still
     * serialize correctly. Does NOT call {@link #requireMember} — the caller
     * is expected to have already confirmed the member exists (payroll import
     * validates this itself, since a missing member is a per-row "error"
     * status in the import result, not an exception that aborts the batch).
     */
    @Transactional
    public SavingsTransactionDto recordDeduction(
            UUID organizationId, UUID memberId, SavingsTxType type, BigDecimal amount,
            String description, String source) {
        BigDecimal previousBalance = savingsTransactionRepository
                .findFirstByOrganizationIdAndMemberIdOrderByCreatedAtDesc(organizationId, memberId)
                .map(SavingsTransaction::getBalanceAfter)
                .orElse(BigDecimal.ZERO);

        BigDecimal newBalance = previousBalance.add(amount);
        SavingsTransaction tx = new SavingsTransaction(
                organizationId, memberId, type, amount, newBalance, description, source);
        savingsTransactionRepository.save(tx);
        return SavingsTransactionDto.from(tx);
    }

    private AppUser requireMember(UUID organizationId, UUID memberId) {
        return memberRepository.findByIdAndOrganizationId(memberId, organizationId)
                .orElseThrow(() -> new NotFoundException("Member not found."));
    }
}
