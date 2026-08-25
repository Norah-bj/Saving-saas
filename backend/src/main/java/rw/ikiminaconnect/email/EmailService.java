package rw.ikiminaconnect.email;

/**
 * Sends transactional email. {@link ConsoleEmailService} is the only
 * implementation today (a dev-only stand-in that logs instead of sending) —
 * swap in a real provider (SMTP/SendGrid/SES/...) by adding a new
 * implementation and removing ConsoleEmailService's {@code @Service}, once
 * real credentials exist. See docs/KNOWN_ISSUES.md.
 */
public interface EmailService {

    void sendVerificationEmail(String toEmail, String recipientName, String verificationLink);
}
