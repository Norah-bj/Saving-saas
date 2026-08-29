package rw.ikiminaconnect.policy;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PolicyDocumentRepository extends JpaRepository<PolicyDocument, UUID> {

    List<PolicyDocument> findAllByOrganizationIdOrderByCategory(UUID organizationId);
}
