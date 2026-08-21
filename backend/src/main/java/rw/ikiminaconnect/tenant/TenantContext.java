package rw.ikiminaconnect.tenant;

import java.util.UUID;

/**
 * Request-scoped (thread-local) holder for the authenticated caller's organization.
 * Set by {@link rw.ikiminaconnect.security.JwtAuthenticationFilter} once the JWT is
 * validated, and MUST be cleared at the end of every request (that filter does this
 * in a finally block) — this is a thread-local backed by a pooled servlet container
 * thread, so leaking a value here would leak one request's tenant into another.
 */
public final class TenantContext {

    private static final ThreadLocal<UUID> ORGANIZATION_ID = new ThreadLocal<>();
    private static final ThreadLocal<Boolean> SUPER_ADMIN = ThreadLocal.withInitial(() -> false);

    private TenantContext() {
    }

    public static void set(UUID organizationId, boolean superAdmin) {
        ORGANIZATION_ID.set(organizationId);
        SUPER_ADMIN.set(superAdmin);
    }

    public static UUID organizationId() {
        return ORGANIZATION_ID.get();
    }

    public static boolean isSuperAdmin() {
        return Boolean.TRUE.equals(SUPER_ADMIN.get());
    }

    /**
     * Use in service methods that require an organization-scoped caller. Throws rather
     * than silently returning null, so a super-admin-only code path that forgets to
     * branch fails loudly instead of accidentally querying with organizationId = null.
     */
    public static UUID requireOrganizationId() {
        UUID id = ORGANIZATION_ID.get();
        if (id == null) {
            throw new IllegalStateException(
                    "No organization in tenant context. Super-admin callers must take an "
                            + "explicit organizationId parameter instead of relying on TenantContext.");
        }
        return id;
    }

    public static void clear() {
        ORGANIZATION_ID.remove();
        SUPER_ADMIN.remove();
    }
}
