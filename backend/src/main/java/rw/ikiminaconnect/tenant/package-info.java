/**
 * Declares the {@code organizationFilter} Hibernate filter exactly once —
 * Hibernate 6 rejects the same named {@code @FilterDef} declared more than
 * once, even identically, so it can't just be repeated on every tenant-scoped
 * entity. Each entity (AppUser, SavingsTransaction, ShareHolding, ...) only
 * needs {@code @Filter(name = "organizationFilter", condition = "...")},
 * referencing this definition by name.
 */
@org.hibernate.annotations.FilterDef(
        name = "organizationFilter",
        parameters = @org.hibernate.annotations.ParamDef(name = "orgId", type = java.util.UUID.class))
package rw.ikiminaconnect.tenant;
