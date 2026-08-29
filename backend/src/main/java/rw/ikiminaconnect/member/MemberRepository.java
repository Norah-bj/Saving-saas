package rw.ikiminaconnect.member;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MemberRepository extends JpaRepository<AppUser, UUID> {

    /** One row per org — super-admin/PlatformOrganizationsController.listAll() needs every org's
     * member count and would otherwise mean one countByOrganizationId call per org in the list. */
    interface OrganizationMemberCount {
        UUID getOrganizationId();
        long getCount();
    }

    @Query("SELECT u.organizationId AS organizationId, COUNT(u) AS count FROM AppUser u GROUP BY u.organizationId")
    List<OrganizationMemberCount> countAllGroupedByOrganization();

    Optional<AppUser> findByEmail(String email);

    // AuthService.bootstrapSuperAdmin() — the bootstrap endpoint only ever
    // works once, so a second attempt (token leaked, script rerun, ...)
    // can't silently mint another platform operator.
    @Query("SELECT COUNT(u) > 0 FROM AppUser u JOIN u.roles r WHERE r.role = rw.ikiminaconnect.member.Role.SUPER_ADMIN")
    boolean existsSuperAdmin();

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

    // MemberService.setCommitteeChair() — enforces at most one chair per
    // organization by demoting whoever currently holds it before promoting
    // someone else. See docs/DECISIONS.md.
    @Query("SELECT u FROM AppUser u JOIN u.roles r WHERE u.organizationId = :orgId "
            + "AND r.role = rw.ikiminaconnect.member.Role.LOAN_COMMITTEE AND r.committeeChair = true")
    Optional<AppUser> findCommitteeChairByOrganizationId(@Param("orgId") UUID organizationId);

    // Notification fan-out (SecretaryOpsService: new meeting/announcement) —
    // just the IDs, not full AppUser rows with their roles collections, since
    // that's all NotificationService.notifyMany needs.
    @Query("SELECT u.id FROM AppUser u WHERE u.organizationId = :orgId")
    List<UUID> findAllIdsByOrganizationId(@Param("orgId") UUID organizationId);

    // Announcements with audience == admins notify staff only. "Staff" here
    // matches every other isStaff check in this codebase: any role other
    // than the base MEMBER one.
    @Query("SELECT DISTINCT u.id FROM AppUser u JOIN u.roles r WHERE u.organizationId = :orgId "
            + "AND r.role <> rw.ikiminaconnect.member.Role.MEMBER")
    List<UUID> findAllStaffIdsByOrganizationId(@Param("orgId") UUID organizationId);
}
