package rw.ikiminaconnect;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import rw.ikiminaconnect.support.IntegrationTestBase;

/** Login, email-verification gating, organization suspension, and cross-tenant isolation. */
class AuthAndTenancyIntegrationTest extends IntegrationTestBase {

    @Test
    void wrongPasswordIsRejected() throws Exception {
        Org org = registerVerifiedOrg();

        Response response = postJson("/auth/login", null, Map.of("email", org.adminEmail(), "password", "wrong-pass"));

        assertThat(response.status()).isEqualTo(401);
    }

    @Test
    void unverifiedAdminCanReachMeButNothingElse() throws Exception {
        String suffix = unique();
        Response registered = postJson("/auth/register", null, Map.ofEntries(
                Map.entry("organizationName", "Unverified Coop " + suffix),
                Map.entry("organizationShortName", "UV" + suffix),
                Map.entry("district", "Gasabo"),
                Map.entry("sector", "Remera"),
                Map.entry("address", "KG 1 Ave"),
                Map.entry("contactEmail", "c-" + suffix + "@test.rw"),
                Map.entry("contactPhone", "0788000001"),
                Map.entry("adminFullName", "Unverified Admin"),
                Map.entry("adminNationalId", "1199" + digits(12)),
                Map.entry("adminEmployeeId", "UV-" + suffix),
                Map.entry("adminEmail", "uv-" + suffix + "@test.rw"),
                Map.entry("adminPhone", "0788000002"),
                Map.entry("password", PASSWORD)));
        assertStatus(registered, 201);
        String token = registered.body().get("accessToken").asText();

        Response me = getJson("/me", token);
        Response members = getJson("/members", token);

        assertThat(me.status()).isEqualTo(200);
        assertThat(me.body().get("emailVerified").asBoolean()).isFalse();
        assertThat(members.status()).isEqualTo(403);
        assertThat(members.body().get("error").asText()).isEqualTo("email_not_verified");
    }

    @Test
    void verificationTokenWorksOnlyOnce() throws Exception {
        Org org = registerVerifiedOrg(); // consumes the token once already

        Response reused = postJson("/auth/verify-email", null, Map.of("token", emails.tokenFor(org.adminEmail())));

        assertThat(reused.status()).isEqualTo(403);
    }

    @Test
    void suspendingAnOrganizationBlocksItsMembersFromLoggingIn() throws Exception {
        Org org = registerVerifiedOrg();
        String superAdmin = superAdminToken();

        assertStatus(postJson("/organizations/" + org.id() + "/status", superAdmin, Map.of("status", "suspended")), 200);
        Response blocked = postJson("/auth/login", null, Map.of("email", org.adminEmail(), "password", PASSWORD));

        assertStatus(postJson("/organizations/" + org.id() + "/status", superAdmin, Map.of("status", "active")), 200);
        Response restored = postJson("/auth/login", null, Map.of("email", org.adminEmail(), "password", PASSWORD));

        assertThat(blocked.status()).isEqualTo(403);
        assertThat(restored.status()).isEqualTo(200);
    }

    @Test
    void orgAdminCannotSeeAnotherOrganizationsData() throws Exception {
        Org orgA = registerVerifiedOrg();
        Org orgB = registerVerifiedOrg();
        Member memberOfB = createMember(orgB, "Member Of B");

        Response detail = getJson("/members/" + memberOfB.id(), orgA.adminToken());
        Response otherOrg = getJson("/organizations/" + orgB.id(), orgA.adminToken());
        Response list = getJson("/members?size=500", orgA.adminToken());
        Response auditLogs = getJson("/audit-logs?organizationId=" + orgB.id(), orgA.adminToken());

        assertThat(detail.status()).isIn(403, 404);
        assertThat(otherOrg.status()).isEqualTo(403);
        assertThat(ids(list.body().get("content"))).doesNotContain(memberOfB.id().toString());
        // ORG_ADMIN's organizationId filter must be ignored server-side: only their own org's rows.
        assertThat(auditLogs.status()).isEqualTo(200);
        for (JsonNode row : contentOf(auditLogs.body())) {
            assertThat(row.get("organizationId").asText()).isEqualTo(orgA.id().toString());
        }
    }

    @Test
    void plainMemberCannotUseStaffEndpoints() throws Exception {
        Org org = registerVerifiedOrg();
        Member member = createMember(org, "Plain Member");

        assertThat(getJson("/members", member.token()).status()).isEqualTo(403);
        assertThat(getJson("/ledger", member.token()).status()).isEqualTo(403);
        assertThat(getJson("/backups", member.token()).status()).isEqualTo(403);
        assertThat(postJson("/backups", org.adminToken(), Map.of("label", "not allowed")).status()).isEqualTo(403);
    }

    private static List<String> ids(JsonNode array) {
        List<String> ids = new ArrayList<>();
        array.forEach(node -> ids.add(node.get("id").asText()));
        return ids;
    }

    /** Audit logs may come back as a plain array or a page object. */
    private static JsonNode contentOf(JsonNode body) {
        return body.has("content") ? body.get("content") : body;
    }
}
