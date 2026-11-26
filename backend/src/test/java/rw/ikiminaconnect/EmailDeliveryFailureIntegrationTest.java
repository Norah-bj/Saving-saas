package rw.ikiminaconnect;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;
import rw.ikiminaconnect.support.IntegrationTestBase;
import rw.ikiminaconnect.support.RecordingEmailService;

/**
 * With real email delivery (Resend), the provider can reject a message — its
 * test sender only delivers to the account owner. Registration must still
 * succeed (the person can resend later), and "Resend" must say clearly that
 * sending failed instead of returning a 500.
 */
class EmailDeliveryFailureIntegrationTest extends IntegrationTestBase {

    @Test
    void registrationSucceedsWhenTheVerificationEmailBounces() throws Exception {
        String suffix = unique();
        String email = RecordingEmailService.BOUNCE_PREFIX + suffix + "@test.rw";

        Response registered = postJson("/auth/register", null, Map.ofEntries(
                Map.entry("organizationName", "Bounce Coop " + suffix),
                Map.entry("organizationShortName", "BC" + suffix),
                Map.entry("district", "Gasabo"),
                Map.entry("sector", "Remera"),
                Map.entry("address", "KG 1 Ave"),
                Map.entry("contactEmail", "c-" + suffix + "@test.rw"),
                Map.entry("contactPhone", "0788000001"),
                Map.entry("adminFullName", "Bounce Admin"),
                Map.entry("adminNationalId", "1195" + digits(12)),
                Map.entry("adminEmployeeId", "BC-1"),
                Map.entry("adminEmail", email),
                Map.entry("adminPhone", "0788000002"),
                Map.entry("password", PASSWORD)));

        assertStatus(registered, 201);
        // The account really exists: the person can sign in and see the "verify your email" notice.
        assertThat(login(email, PASSWORD)).isNotBlank();

        Response resend = postJson("/auth/resend-verification", registered.body().get("accessToken").asText(), null);
        assertThat(resend.status()).isEqualTo(409);
        assertThat(resend.message()).contains("couldn't send");
    }
}
