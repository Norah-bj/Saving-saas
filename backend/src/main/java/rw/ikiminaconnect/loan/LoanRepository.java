package rw.ikiminaconnect.loan;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LoanRepository extends JpaRepository<Loan, UUID> {
    Optional<Loan> findByIdAndOrganizationId(UUID id, UUID organizationId);

    Page<Loan> findAllByOrganizationIdOrderByCreatedAtDesc(UUID organizationId, Pageable pageable);

    Page<Loan> findAllByOrganizationIdAndMemberIdOrderByCreatedAtDesc(
            UUID organizationId, UUID memberId, Pageable pageable);

    long countByOrganizationId(UUID organizationId);

    List<Loan> findAllByOrganizationId(UUID organizationId);

    @Query("SELECT COALESCE(SUM(l.remainingBalance), 0) FROM Loan l "
            + "WHERE l.organizationId = :orgId AND l.status IN :statuses")
    BigDecimal sumRemainingBalanceByStatuses(@Param("orgId") UUID orgId, @Param("statuses") List<LoanStatus> statuses);

    @Query("SELECT new rw.ikiminaconnect.loan.LoanStatusCount(l.status, COUNT(l)) "
            + "FROM Loan l WHERE l.organizationId = :orgId GROUP BY l.status")
    List<LoanStatusCount> countByStatus(@Param("orgId") UUID orgId);
}
