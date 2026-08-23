package rw.ikiminaconnect.member;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberRepository extends JpaRepository<AppUser, UUID> {

    Optional<AppUser> findByEmail(String email);

    boolean existsByNationalId(String nationalId);

    boolean existsByOrganizationIdAndEmployeeId(UUID organizationId, String employeeId);

    Optional<AppUser> findByOrganizationIdAndEmployeeId(UUID organizationId, String employeeId);

    // Every lookup that can return tenant data takes organizationId explicitly —
    // this is the primary tenant-isolation guarantee for this slice, not just the
    // Hibernate filter. See OrganizationFilterInterceptor's javadoc.
    Optional<AppUser> findByIdAndOrganizationId(UUID id, UUID organizationId);

    Page<AppUser> findAllByOrganizationId(UUID organizationId, Pageable pageable);

    Page<AppUser> findAllByOrganizationIdAndFullNameContainingIgnoreCase(
            UUID organizationId, String search, Pageable pageable);

    long countByOrganizationId(UUID organizationId);
}
