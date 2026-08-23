package rw.ikiminaconnect.membership;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShareWithdrawalRequestRepository extends JpaRepository<ShareWithdrawalRequest, UUID> {
    List<ShareWithdrawalRequest> findAllByOrganizationIdOrderByRequestedDateDesc(UUID organizationId);

    List<ShareWithdrawalRequest> findAllByOrganizationIdAndMemberIdOrderByRequestedDateDesc(
            UUID organizationId, UUID memberId);

    Optional<ShareWithdrawalRequest> findByIdAndOrganizationId(UUID id, UUID organizationId);
}
