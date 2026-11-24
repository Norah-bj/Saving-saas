package rw.ikiminaconnect.email;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

/**
 * Dev-only stand-in for a real email provider: logs the message instead of
 * sending it. Chosen deliberately over wiring a real SMTP/SendGrid/SES
 * account before one exists, so email verification isn't blocked on
 * provider credentials — see docs/KNOWN_ISSUES.md. Read the verification
 * link from the application log to test the flow locally.
 */
@Service
@ConditionalOnProperty(name = "app.email.provider", havingValue = "console", matchIfMissing = true)
public class ConsoleEmailService implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(ConsoleEmailService.class);

    @Override
    public void sendVerificationEmail(String toEmail, String recipientName, String verificationLink) {
        log.info("[DEV EMAIL STUB] Verification email to {} <{}> — link: {}", recipientName, toEmail, verificationLink);
    }

    @Override
    public void sendInviteEmail(String toEmail, String recipientName, String organizationName, String inviteLink) {
        log.info("[DEV EMAIL STUB] Invite to {} for {} <{}> — link: {}", organizationName, recipientName, toEmail, inviteLink);
    }

    @Override
    public void sendPasswordResetEmail(String toEmail, String recipientName, String resetLink) {
        log.info("[DEV EMAIL STUB] Password reset for {} <{}> — link: {}", recipientName, toEmail, resetLink);
    }
}
