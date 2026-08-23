package rw.ikiminaconnect.savings;

import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SavingsTransactionRepository extends JpaRepository<SavingsTransaction, UUID> {

    Page<SavingsTransaction> findAllByOrganizationIdAndMemberIdOrderByCreatedAtDesc(
            UUID organizationId, UUID memberId, Pageable pageable);

    /**
     * Every transaction for the organization, oldest first — used for the
     * accountant reporting aggregates (month-by-month savings growth,
     * this-month contributions), which are computed in Java by walking this
     * list once rather than issuing one query per month. Fine at
     * SACCO-sized data volumes; revisit with a windowed SQL query if an
     * organization's transaction count ever makes this a real cost.
     */
    List<SavingsTransaction> findAllByOrganizationIdOrderByCreatedAtAsc(UUID organizationId);

    /**
     * Sum of each member's *current* (most recent) balance across the whole
     * organization — Postgres' DISTINCT ON picks the latest row per member
     * efficiently in one pass rather than N queries (one per member).
     */
    @Query(value = """
            SELECT COALESCE(SUM(latest.balance_after), 0)
            FROM (
                SELECT DISTINCT ON (member_id) member_id, balance_after
                FROM savings_transactions
                WHERE organization_id = :orgId
                ORDER BY member_id, created_at DESC
            ) latest
            """, nativeQuery = true)
    BigDecimal sumCurrentBalances(@Param("orgId") UUID orgId);

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
