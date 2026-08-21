package rw.ikiminaconnect.member;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.util.Objects;

/**
 * One row of the user_roles join table. {@code committeeChair} is only
 * meaningful when {@code role == LOAN_COMMITTEE} — see the committee-chair
 * business rule in docs/BACKEND_CONTRACT.md.
 */
@Embeddable
public class UserRoleAssignment {

    @Column(name = "role", nullable = false)
    private Role role;

    @Column(name = "is_committee_chair", nullable = false)
    private boolean committeeChair;

    protected UserRoleAssignment() {
        // JPA
    }

    public UserRoleAssignment(Role role, boolean committeeChair) {
        this.role = role;
        this.committeeChair = committeeChair;
    }

    public Role getRole() {
        return role;
    }

    public boolean isCommitteeChair() {
        return committeeChair;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof UserRoleAssignment that)) return false;
        return role == that.role;
    }

    @Override
    public int hashCode() {
        return Objects.hash(role);
    }
}
