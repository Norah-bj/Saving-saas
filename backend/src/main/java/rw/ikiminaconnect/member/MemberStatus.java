package rw.ikiminaconnect.member;

// Lowercase constant names (not the usual Java UPPER_CASE convention) so
// @Enumerated(EnumType.STRING)'s name() matches the DB CHECK constraint's
// values directly — same convention as organization.SubscriptionPlan and
// organization.OrganizationStatus. No hyphens in this vocabulary, so unlike
// Role/SavingsTxType this doesn't need a converter.
public enum MemberStatus {
    active, suspended, exited, pending
}
