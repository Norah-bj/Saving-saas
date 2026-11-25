package rw.ikiminaconnect.support;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import rw.ikiminaconnect.email.EmailService;

/**
 * Test double for {@link EmailService}: remembers the latest verification link
 * per recipient instead of sending anything, so tests can complete the real
 * {@code POST /auth/verify-email} flow with a genuine token (tokens are stored
 * hashed, so they can't be read back from the database).
 */
public class RecordingEmailService implements EmailService {

    private final Map<String, String> latestLinkByEmail = new ConcurrentHashMap<>();

    @Override
    public void sendVerificationEmail(String toEmail, String recipientName, String verificationLink) {
        latestLinkByEmail.put(toEmail.toLowerCase(), verificationLink);
    }

    public String tokenFor(String email) {
        String link = latestLinkByEmail.get(email.toLowerCase());
        if (link == null) {
            throw new AssertionError("No verification email was sent to " + email);
        }
        return link.substring(link.indexOf("token=") + "token=".length());
    }

    @TestConfiguration
    public static class Config {
        @Bean
        @Primary
        RecordingEmailService recordingEmailService() {
            return new RecordingEmailService();
        }
    }
}
