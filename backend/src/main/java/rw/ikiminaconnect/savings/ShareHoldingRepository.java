package rw.ikiminaconnect.savings;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShareHoldingRepository extends JpaRepository<ShareHolding, UUID> {
    Optional<ShareHolding> findByMemberIdAndOrganizationId(UUID memberId, UUID organizationId);
}
