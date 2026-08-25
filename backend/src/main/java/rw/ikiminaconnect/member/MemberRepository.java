package rw.ikiminaconnect.member;

import java.util.List;
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

    // Used by EmailVerificationFilter on every gated request — a plain
    // existence check avoids loading the full AppUser (roles collection etc.)
    // just to read one boolean.
    boolean existsByIdAndEmailVerifiedTrue(UUID id);

    // Guarantor candidate picker (member/LoanApply.tsx) — any authenticated
    // member can call this, unlike the full GET /members list, so it must
    // never return anything sensitive (national ID, savings balance, ...).
    // See GuarantorCandidateDto.
    List<AppUser> findAllByOrganizationIdAndIdNotAndStatus(
            UUID organizationId, UUID excludedId, MemberStatus status);
}
