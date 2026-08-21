package rw.ikiminaconnect.savings;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface SavingsTransactionRepository extends JpaRepository<SavingsTransaction, UUID> {

    Page<SavingsTransaction> findAllByOrganizationIdAndMemberIdOrderByCreatedAtDesc(
            UUID organizationId, UUID memberId, Pageable pageable);

    /**
     * Locks the member's most recent ledger row (SELECT ... FOR UPDATE) so
     * concurrent writers for the same member serialize instead of racing to
     * read the same "current balance" and both computing a stale next value.
     * See SavingsService for how this is used. Known gap: a brand-new
     * member's very first transaction has no prior row to lock against — an
     * acceptable, documented limitation for this vertical slice, not a
     * concern for a member who already has ledger history.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<SavingsTransaction> findFirstByOrganizationIdAndMemberIdOrderByCreatedAtDesc(
            UUID organizationId, UUID memberId);
}
