package rw.ikiminaconnect.email;

import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/** Sends verification messages through Resend's server-side HTTP API. */
@Service
@ConditionalOnProperty(name = "app.email.provider", havingValue = "resend")
public class ResendEmailService implements EmailService {

    private final RestClient client;
    private final String from;

    public ResendEmailService(RestClient.Builder builder,
            @Value("${app.email.resend-api-key}") String apiKey,
            @Value("${app.email.from}") String from) {
        this.client = builder.baseUrl("https://api.resend.com")
                .defaultHeader("Authorization", "Bearer " + apiKey).build();
        this.from = from;
    }

    @Override
    public void sendVerificationEmail(String toEmail, String recipientName, String verificationLink) {
        String html = "<p>Hello " + escape(recipientName) + ",</p>"
                + "<p>Click below to verify your IkiminaConnect email:</p>"
                + "<p><a href=\"" + escape(verificationLink) + "\">Verify my email address</a></p>"
                + "<p>This link expires in 24 hours.</p>";
        client.post().uri("/emails").contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("from", from, "to", new String[] {toEmail},
                        "subject", "Verify your IkiminaConnect email", "html", html))
                .retrieve().toBodilessEntity();
    }

    @Override
    public void sendInviteEmail(String toEmail, String recipientName, String organizationName, String inviteLink) {
        String html = "<p>Hello " + escape(recipientName) + ",</p>"
                + "<p>You've been added to <strong>" + escape(organizationName) + "</strong> on IkiminaConnect.</p>"
                + "<p>Click below to choose your password and sign in:</p>"
                + "<p><a href=\"" + escape(inviteLink) + "\">Accept invitation</a></p>"
                + "<p>This link expires in 72 hours and can only be used once. "
                + "If you weren't expecting this, you can ignore this email.</p>";
        client.post().uri("/emails").contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("from", from, "to", new String[] {toEmail},
                        "subject", "You're invited to " + organizationName + " on IkiminaConnect", "html", html))
                .retrieve().toBodilessEntity();
    }

    @Override
    public void sendPasswordResetEmail(String toEmail, String recipientName, String resetLink) {
        String html = "<p>Hello " + escape(recipientName) + ",</p>"
                + "<p>We received a request to reset your IkiminaConnect password.</p>"
                + "<p><a href=\"" + escape(resetLink) + "\">Choose a new password</a></p>"
                + "<p>This link expires in 1 hour and can only be used once. "
                + "If you didn't ask for this, you can ignore this email — your password won't change.</p>";
        client.post().uri("/emails").contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("from", from, "to", new String[] {toEmail},
                        "subject", "Reset your IkiminaConnect password", "html", html))
                .retrieve().toBodilessEntity();
    }

    private static String escape(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&#39;");
    }
}
