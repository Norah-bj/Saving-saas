package rw.ikiminaconnect.security;

import java.util.Set;
import java.util.UUID;

/**
 * The authenticated caller, as parsed from the JWT access token by
 * {@link JwtAuthenticationFilter} and set as the Spring Security principal.
 * {@code organizationId} is null only for {@code super-admin} users.
 */
public record CurrentUser(
        UUID userId, UUID organizationId, Set<String> roles, boolean committeeChair, String fullName) {

    public boolean isSuperAdmin() {
        return roles.contains("super-admin");
    }

    public boolean hasRole(String role) {
        return roles.contains(role);
    }
}
