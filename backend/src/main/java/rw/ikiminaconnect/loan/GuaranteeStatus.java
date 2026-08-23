package rw.ikiminaconnect.loan;

// Lowercase constant names, same convention as member.MemberStatus — no
// hyphens in this vocabulary, so @Enumerated(STRING) matches the DB CHECK
// constraint directly without needing a converter.
public enum GuaranteeStatus {
    pending, accepted, rejected, released
}
