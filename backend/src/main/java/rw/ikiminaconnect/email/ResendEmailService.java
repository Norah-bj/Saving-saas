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

    private static String escape(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&#39;");
    }
}
