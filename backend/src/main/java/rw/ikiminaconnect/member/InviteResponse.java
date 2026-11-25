package rw.ikiminaconnect.member;

/** Result of re-sending a member's invitation — see {@link CreateMemberResponse} for the fields' meaning. */
public record InviteResponse(String inviteLink, boolean inviteEmailSent) {
}
