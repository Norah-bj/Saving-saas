package rw.ikiminaconnect.tenant;

import jakarta.persistence.EntityManager;
import org.hibernate.Session;
import org.springframework.stereotype.Component;

/**
 * Enables the Hibernate {@code organizationFilter} (declared via {@code @FilterDef}/
 * {@code @Filter} on tenant-scoped entities) against the current persistence context,
 * bound to {@link TenantContext}'s organization id.
 *
 * <p>This is defense-in-depth, not the primary isolation mechanism. The primary
 * guarantee for this vertical slice is that every repository method that can return
 * tenant data takes an explicit {@code organizationId} parameter (e.g.
 * {@code findByIdAndOrganizationId}) — that's what's actually tested and what
 * guarantees isolation regardless of whether a filter was remembered. This class
 * exists so a query that traverses a relationship without going through an explicit
 * org-scoped repository method (a mistake, but one that happens) still can't leak
 * across tenants.
 *
 * <p>Because {@code spring.jpa.open-in-view} is disabled, the Hibernate
 * {@link Session} only exists inside an active transaction — call {@link #apply}
 * from inside a {@code @Transactional} service method, not from a servlet filter.
 * Every service in this codebase should call it at the top of its transactional
 * methods; see {@code SavingsService} for the reference usage.
 */
@Component
public class OrganizationFilterInterceptor {

    private static final String FILTER_NAME = "organizationFilter";
    private static final String FILTER_PARAM = "orgId";

    public void apply(EntityManager entityManager) {
        entityManager.unwrap(Session.class)
                .enableFilter(FILTER_NAME)
                .setParameter(FILTER_PARAM, TenantContext.requireOrganizationId());
    }
}
