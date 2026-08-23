package rw.ikiminaconnect.ledger;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LedgerTransactionRepository extends JpaRepository<LedgerTransaction, UUID> {

    @Query("SELECT t FROM LedgerTransaction t WHERE t.organizationId = :orgId "
            + "AND (:type IS NULL OR t.type = :type) "
            + "AND (:method IS NULL OR t.method = :method) "
            + "AND (:memberId IS NULL OR t.memberId = :memberId) "
            + "ORDER BY t.occurredOn DESC, t.createdAt DESC")
    Page<LedgerTransaction> search(
            @Param("orgId") UUID orgId,
            @Param("type") LedgerTxType type,
            @Param("method") LedgerTxMethod method,
            @Param("memberId") UUID memberId,
            Pageable pageable);

    /** For the accountant reporting aggregates — see SavingsTransactionRepository's equivalent for the same reasoning. */
    List<LedgerTransaction> findAllByOrganizationIdOrderByOccurredOnAsc(UUID orgId);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM LedgerTransaction t "
            + "WHERE t.organizationId = :orgId AND t.type = :type")
    BigDecimal sumByType(@Param("orgId") UUID orgId, @Param("type") LedgerTxType type);
}
