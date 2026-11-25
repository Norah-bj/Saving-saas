package rw.ikiminaconnect.member;

/**
 * Since gap-closure phase 9 a staff-added member gets an invite link instead
 * of a temporary password. {@code inviteLink} is returned to the staff member
 * who created the account so they can share it another way (WhatsApp, SMS)
 * when {@code inviteEmailSent} is false — e.g. before a Resend sending domain
 * is verified. It's single-use and expires (see auth/InviteService).
 */
public record CreateMemberResponse(MemberSummary member, String inviteLink, boolean inviteEmailSent) {
}
