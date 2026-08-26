package rw.ikiminaconnect.savings;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ShareHoldingRepository extends JpaRepository<ShareHolding, UUID> {
    Optional<ShareHolding> findByMemberIdAndOrganizationId(UUID memberId, UUID organizationId);

    // org-admin/Dashboard.tsx's "Total Shares Value" stat — one aggregate
    // query rather than fetching every member's holding row individually.
    @Query("SELECT COALESCE(SUM(s.totalShares), 0) FROM ShareHolding s WHERE s.organizationId = :organizationId")
    long sumTotalSharesByOrganizationId(@Param("organizationId") UUID organizationId);
}
