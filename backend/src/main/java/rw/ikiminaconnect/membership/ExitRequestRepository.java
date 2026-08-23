package rw.ikiminaconnect.membership;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExitRequestRepository extends JpaRepository<ExitRequest, UUID> {
    List<ExitRequest> findAllByOrganizationIdOrderByRequestedDateDesc(UUID organizationId);

    Optional<ExitRequest> findByIdAndOrganizationId(UUID id, UUID organizationId);

    boolean existsByOrganizationIdAndMemberIdAndStatus(UUID organizationId, UUID memberId, RequestStatus status);
}
