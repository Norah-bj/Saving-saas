package rw.ikiminaconnect.email;

/**
 * Sends transactional email. Local development uses {@link ConsoleEmailService};
 * production may select {@link ResendEmailService} with configuration.
 */
public interface EmailService {

    void sendVerificationEmail(String toEmail, String recipientName, String verificationLink);

    /** Invitation for a staff-added member to set their password and join their organization. */
    void sendInviteEmail(String toEmail, String recipientName, String organizationName, String inviteLink);

    /** Self-service password reset link. */
    void sendPasswordResetEmail(String toEmail, String recipientName, String resetLink);
}
