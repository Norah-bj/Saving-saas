package rw.ikiminaconnect;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;
import org.junit.jupiter.api.Test;
import rw.ikiminaconnect.support.IntegrationTestBase;
import rw.ikiminaconnect.support.RecordingEmailService;

/** Staff invites (gap-closure phase 9): invite link instead of a temporary password. */
class StaffInviteIntegrationTest extends IntegrationTestBase {

    @Test
    void invitedMemberCannotSignInUntilTheyChooseAPassword() throws Exception {
        Org org = registerVerifiedOrg();

        Response created = postMember(org, "New Teller");
        String email = created.body().get("email").asText();
        JsonNode member = created.body().get("member");

        assertThat(created.body().has("temporaryPassword")).isFalse();
        assertThat(created.body().get("inviteEmailSent").asBoolean()).isTrue();
        assertThat(member.get("invitePending").asBoolean()).isTrue();
        // The emailed link and the link returned to the admin are the same invite.
        String token = RecordingEmailService.tokenFromLink(created.body().get("inviteLink").asText());
        assertThat(emails.inviteTokenFor(email)).isEqualTo(token);

        // No password exists yet, so any login attempt fails with the generic message.
        Response earlyLogin = postJson("/auth/login", null, Map.of("email", email, "password", "anything123"));
        assertThat(earlyLogin.status()).isEqualTo(401);

        Response tooShort = postJson("/auth/accept-invite", null, Map.of("token", token, "password", "short"));
        assertThat(tooShort.status()).isEqualTo(400);

        Response accepted = postJson("/auth/accept-invite", null, Map.of("token", token, "password", PASSWORD));
        assertStatus(accepted, 200);
        assertThat(accepted.body().get("accessToken").asText()).isNotBlank();
        assertThat(accepted.body().get("user").get("emailVerified").asBoolean()).isTrue();

        // Their own password now works, the link is spent, and the roster shows them as joined.
        assertThat(login(email, PASSWORD)).isNotBlank();
        Response reused = postJson("/auth/accept-invite", null, Map.of("token", token, "password", "AnotherPass123!"));
        assertThat(reused.status()).isEqualTo(403);
        assertThat(rosterEntry(org, member.get("id").asText()).get("invitePending").asBoolean()).isFalse();
    }

    @Test
    void resendingRetiresTheOldLinkAndStopsOnceAccepted() throws Exception {
        Org org = registerVerifiedOrg();
        Response created = postMember(org, "Late Joiner");
        String memberId = created.body().get("member").get("id").asText();
        String oldToken = RecordingEmailService.tokenFromLink(created.body().get("inviteLink").asText());

        Response resent = postJson("/members/" + memberId + "/resend-invite", org.adminToken(), null);
        assertStatus(resent, 200);
        String newToken = RecordingEmailService.tokenFromLink(resent.body().get("inviteLink").asText());
        assertThat(newToken).isNotEqualTo(oldToken);

        assertThat(postJson("/auth/accept-invite", null, Map.of("token", oldToken, "password", PASSWORD)).status())
                .isEqualTo(403);
        assertStatus(postJson("/auth/accept-invite", null, Map.of("token", newToken, "password", PASSWORD)), 200);

        Response afterAccept = postJson("/members/" + memberId + "/resend-invite", org.adminToken(), null);
        assertThat(afterAccept.status()).isEqualTo(409);
    }

    @Test
    void onlyStaffOfTheSameOrganizationCanResendInvites() throws Exception {
        Org org = registerVerifiedOrg();
        Org otherOrg = registerVerifiedOrg();
        Member plainMember = createMember(org, "Plain Member");
        String pendingId = postMember(org, "Pending Person").body().get("member").get("id").asText();

        assertThat(postJson("/members/" + pendingId + "/resend-invite", plainMember.token(), null).status())
                .isEqualTo(403);
        assertThat(postJson("/members/" + pendingId + "/resend-invite", otherOrg.adminToken(), null).status())
                .isEqualTo(404);
    }

    @Test
    void invalidTokenIsRejected() throws Exception {
        Response response = postJson("/auth/accept-invite", null, Map.of("token", "not-a-real-token", "password", PASSWORD));

        assertThat(response.status()).isEqualTo(403);
    }

    private JsonNode rosterEntry(Org org, String memberId) throws Exception {
        for (JsonNode row : getJson("/members?size=500", org.adminToken()).body().get("content")) {
            if (row.get("id").asText().equals(memberId)) {
                return row;
            }
        }
        throw new AssertionError("Member " + memberId + " not in roster");
    }
}
