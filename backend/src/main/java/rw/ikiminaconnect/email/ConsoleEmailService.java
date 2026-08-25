package rw.ikiminaconnect.email;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Dev-only stand-in for a real email provider: logs the message instead of
 * sending it. Chosen deliberately over wiring a real SMTP/SendGrid/SES
 * account before one exists, so email verification isn't blocked on
 * provider credentials — see docs/KNOWN_ISSUES.md. Read the verification
 * link from the application log to test the flow locally.
 */
@Service
public class ConsoleEmailService implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(ConsoleEmailService.class);

    @Override
    public void sendVerificationEmail(String toEmail, String recipientName, String verificationLink) {
        log.info("[DEV EMAIL STUB] Verification email to {} <{}> — link: {}", recipientName, toEmail, verificationLink);
    }
}
