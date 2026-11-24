package rw.ikiminaconnect;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;
import rw.ikiminaconnect.support.IntegrationTestBase;

/** Self-service password reset (gap-closure phase 9). */
class PasswordResetIntegrationTest extends IntegrationTestBase {

    private static final String NEW_PASSWORD = "BrandNewPass456!";

    @Test
    void resetLinkSetsANewPasswordAndEndsOtherSessions() throws Exception {
        Org org = registerVerifiedOrg();
        Member member = createMember(org, "Forgetful Member");
        Response loggedIn = postJson("/auth/login", null, Map.of("email", member.email(), "password", PASSWORD));
        String oldRefreshToken = loggedIn.body().get("refreshToken").asText();

        assertThat(postJson("/auth/forgot-password", null, Map.of("email", member.email())).status()).isEqualTo(204);
        String token = emails.resetTokenFor(member.email());
        assertThat(token).isNotNull();

        Response tooShort = postJson("/auth/reset-password", null, Map.of("token", token, "password", "short"));
        assertThat(tooShort.status()).isEqualTo(400);
        assertThat(postJson("/auth/reset-password", null, Map.of("token", token, "password", NEW_PASSWORD)).status())
                .isEqualTo(204);

        // New password works, old one doesn't, the link is spent, and old sessions can't be renewed.
        assertThat(login(member.email(), NEW_PASSWORD)).isNotBlank();
        assertThat(postJson("/auth/login", null, Map.of("email", member.email(), "password", PASSWORD)).status())
                .isEqualTo(401);
        assertThat(postJson("/auth/reset-password", null, Map.of("token", token, "password", "YetAnother789!")).status())
                .isEqualTo(403);
        assertThat(postJson("/auth/refresh", null, Map.of("refreshToken", oldRefreshToken)).status())
                .isEqualTo(403);
    }

    @Test
    void unknownEmailGetsTheSameAnswerAndNoEmail() throws Exception {
        String unknown = "nobody-" + unique() + "@test.rw";

        Response response = postJson("/auth/forgot-password", null, Map.of("email", unknown));

        assertThat(response.status()).isEqualTo(204);
        assertThat(emails.resetTokenFor(unknown)).isNull();
    }

    @Test
    void pendingInviteGetsNoResetLink() throws Exception {
        Org org = registerVerifiedOrg();
        String email = postMember(org, "Not Joined Yet").body().get("email").asText();

        assertThat(postJson("/auth/forgot-password", null, Map.of("email", email)).status()).isEqualTo(204);

        assertThat(emails.resetTokenFor(email)).isNull();
    }

    @Test
    void anInviteTokenCannotBeUsedAsAResetToken() throws Exception {
        Org org = registerVerifiedOrg();
        Response created = postMember(org, "Token Mixer");
        String inviteToken = rw.ikiminaconnect.support.RecordingEmailService
                .tokenFromLink(created.body().get("inviteLink").asText());

        Response response = postJson("/auth/reset-password", null, Map.of("token", inviteToken, "password", NEW_PASSWORD));

        assertThat(response.status()).isEqualTo(403);
    }
}
