package rw.ikiminaconnect.member;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.UuidGenerator;
import rw.ikiminaconnect.organization.Organization;

/**
 * A member/officer. Mirrors src/lib/types.ts's AppUser interface. `roles` and
 * per-role `isCommitteeChair` live in the user_roles table (see
 * {@link UserRoleAssignment}) rather than a plain string array, so the
 * committee-chair flag has somewhere to live — see docs/BACKEND_CONTRACT.md.
 *
 * <p>The {@code organizationFilter} below is the defense-in-depth layer
 * described in {@link rw.ikiminaconnect.tenant.OrganizationFilterInterceptor}
 * — the primary isolation guarantee is still every repository method taking
 * organizationId explicitly. The filter itself is defined once, in
 * {@code rw.ikiminaconnect.tenant.package-info} — Hibernate rejects the same
 * named {@code @FilterDef} declared more than once, so it can't be repeated here.
 */
@Entity
@Table(name = "users")
@Filter(name = "organizationFilter", condition = "organization_id = :orgId")
public class AppUser {

    @Id
    @UuidGenerator
    private UUID id;

    // Nullable only for platform super-admin users.
    @ManyToOne
    @JoinColumn(name = "organization_id")
    private Organization organization;

    // Read-only mirror of organization.id as a plain scalar column. Spring
    // Data's derived-query nested-property splitting (OrganizationId ->
    // organization.id) turned out not to resolve reliably here — this gives
    // every findBy/existsBy...OrganizationId... method in the repositories a
    // real, unambiguous attribute to bind to instead. Kept in sync with
    // `organization` manually in the constructor; Hibernate repopulates it
    // from this same column on every load, so it never drifts after that.
    @Column(name = "organization_id", insertable = false, updatable = false)
    private UUID organizationId;

    @Column(name = "national_id", nullable = false, unique = true)
    private String nationalId;

    @Column(name = "employee_id", nullable = false)
    private String employeeId;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String phone;

    @Column(nullable = false)
    private String department = "";

    @Column(nullable = false)
    private String position = "";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MemberStatus status = MemberStatus.pending;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    // False only for a self-registering org-admin (POST /auth/register) until
    // they click the link in EmailVerificationService's email. Members added
    // by staff (MemberService.create) are marked verified immediately — the
    // adding admin already vouches for them. See EmailVerificationFilter.
    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified = false;

    @Column(name = "date_joined", nullable = false)
    private LocalDate dateJoined;

    @Column(name = "monthly_salary_rwf", nullable = false, precision = 14, scale = 2)
    private BigDecimal monthlySalaryRwf = BigDecimal.ZERO;

    @Column(name = "bank_name")
    private String bankName;

    @Column(name = "bank_account_number")
    private String bankAccountNumber;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
    private Set<UserRoleAssignment> roles = new LinkedHashSet<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected AppUser() {
        // JPA
    }

    public AppUser(Organization organization, String nationalId, String employeeId, String fullName,
                   String email, String phone, String department, String position, String passwordHash,
                   BigDecimal monthlySalaryRwf) {
        this.organization = organization;
        this.organizationId = organization == null ? null : organization.getId();
        this.nationalId = nationalId;
        this.employeeId = employeeId;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.department = department == null ? "" : department;
        this.position = position == null ? "" : position;
        this.passwordHash = passwordHash;
        this.monthlySalaryRwf = monthlySalaryRwf == null ? BigDecimal.ZERO : monthlySalaryRwf;
        this.dateJoined = LocalDate.now();
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void addRole(Role role, boolean committeeChair) {
        roles.removeIf(r -> r.getRole() == role);
        roles.add(new UserRoleAssignment(role, committeeChair));
    }

    /**
     * Replaces this user's entire role set. Committee-chair status is
     * preserved if {@code LOAN_COMMITTEE} remains in the new set, and lost
     * (reset to false) if it doesn't — this method never grants chair status,
     * only carries it forward. Chair assignment has no dedicated endpoint yet
     * (see docs/KNOWN_ISSUES.md); it's still only settable directly in the DB.
     */
    public void replaceRoles(Set<Role> newRoles) {
        boolean wasChair = isCommitteeChair();
        Set<UserRoleAssignment> updated = new LinkedHashSet<>();
        for (Role role : newRoles) {
            updated.add(new UserRoleAssignment(role, role == Role.LOAN_COMMITTEE && wasChair));
        }
        this.roles = updated;
    }

    public boolean hasRole(Role role) {
        return roles.stream().anyMatch(r -> r.getRole() == role);
    }

    public boolean isCommitteeChair() {
        return roles.stream().anyMatch(r -> r.getRole() == Role.LOAN_COMMITTEE && r.isCommitteeChair());
    }

    public void activate() {
        this.status = MemberStatus.active;
    }

    public void suspend() {
        this.status = MemberStatus.suspended;
    }

    /** Set on approval of an exit request — see membership.ExitRequestService. Permanent; no un-exit path exists. */
    public void exit() {
        this.status = MemberStatus.exited;
    }

    public void verifyEmail() {
        this.emailVerified = true;
    }

    public UUID getId() {
        return id;
    }

    public Organization getOrganization() {
        return organization;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public String getNationalId() {
        return nationalId;
    }

    public String getEmployeeId() {
        return employeeId;
    }

    public String getFullName() {
        return fullName;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
    }

    public String getDepartment() {
        return department;
    }

    public String getPosition() {
        return position;
    }

    public MemberStatus getStatus() {
        return status;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public boolean isEmailVerified() {
        return emailVerified;
    }

    public LocalDate getDateJoined() {
        return dateJoined;
    }

    public BigDecimal getMonthlySalaryRwf() {
        return monthlySalaryRwf;
    }

    public String getBankName() {
        return bankName;
    }

    public String getBankAccountNumber() {
        return bankAccountNumber;
    }

    public Set<UserRoleAssignment> getRoles() {
        return roles;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
