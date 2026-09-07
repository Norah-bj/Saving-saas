package rw.ikiminaconnect.email;

/**
 * Sends transactional email. Local development uses {@link ConsoleEmailService};
 * production may select {@link ResendEmailService} with configuration.
 */
public interface EmailService {

    void sendVerificationEmail(String toEmail, String recipientName, String verificationLink);
}
