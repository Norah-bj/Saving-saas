package rw.ikiminaconnect.member;

/**
 * {@code temporaryPassword} is shown exactly once — it isn't retrievable
 * again, only re-issuable (a future "reset member password" endpoint, not in
 * this slice). Deferring email-based invites to phase 16 (notifications).
 */
public record CreateMemberResponse(MemberSummary member, String temporaryPassword) {
}
