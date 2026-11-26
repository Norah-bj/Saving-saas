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

    /** Addresses starting with this prefix simulate the provider rejecting the message. */
    public static final String BOUNCE_PREFIX = "bounce-";

    @Override
    public void sendVerificationEmail(String toEmail, String recipientName, String verificationLink) {
        if (toEmail.toLowerCase().startsWith(BOUNCE_PREFIX)) {
            throw new IllegalStateException("Simulated provider rejection for " + toEmail);
        }
        latestLinkByEmail.put(toEmail.toLowerCase(), verificationLink);
    }

    private final Map<String, String> latestInviteByEmail = new ConcurrentHashMap<>();

    @Override
    public void sendInviteEmail(String toEmail, String recipientName, String organizationName, String inviteLink) {
        latestInviteByEmail.put(toEmail.toLowerCase(), inviteLink);
    }

    /** The token from the most recent invite emailed to this address. */
    public String inviteTokenFor(String email) {
        String link = latestInviteByEmail.get(email.toLowerCase());
        if (link == null) {
            throw new AssertionError("No invite email was sent to " + email);
        }
        return tokenFromLink(link);
    }

    private final Map<String, String> latestResetByEmail = new ConcurrentHashMap<>();

    @Override
    public void sendPasswordResetEmail(String toEmail, String recipientName, String resetLink) {
        latestResetByEmail.put(toEmail.toLowerCase(), resetLink);
    }

    /** The token from the most recent reset email to this address, or null if none was sent. */
    public String resetTokenFor(String email) {
        String link = latestResetByEmail.get(email.toLowerCase());
        return link == null ? null : tokenFromLink(link);
    }

    public static String tokenFromLink(String link) {
        return link.substring(link.indexOf("token=") + "token=".length());
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
