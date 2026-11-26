package rw.ikiminaconnect.organization;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizationLogoRepository extends JpaRepository<OrganizationLogo, UUID> {
}
