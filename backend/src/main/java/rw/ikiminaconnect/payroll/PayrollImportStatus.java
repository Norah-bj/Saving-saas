package rw.ikiminaconnect.payroll;

// Lowercase constant names so @Enumerated(STRING) matches the DB CHECK
// constraint directly — no hyphens in this vocabulary, same convention as
// member.MemberStatus.
public enum PayrollImportStatus {
    matched, error, duplicate
}
