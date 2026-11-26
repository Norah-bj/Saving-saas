package rw.ikiminaconnect;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import rw.ikiminaconnect.common.ForbiddenException;
import rw.ikiminaconnect.common.PaymentsMode;
import rw.ikiminaconnect.support.IntegrationTestBase;

/** Server-side field formats, and the demo/disabled payments switch. */
class ValidationAndPaymentsModeIntegrationTest extends IntegrationTestBase {

    private Map<String, Object> validRegistration() {
        String suffix = unique();
        Map<String, Object> body = new HashMap<>();
        body.put("organizationName", "Valid Coop " + suffix);
        body.put("organizationShortName", "VC" + suffix);
        body.put("district", "Gasabo");
        body.put("sector", "Remera");
        body.put("address", "KG 1 Ave");
        body.put("contactEmail", "c-" + suffix + "@test.rw");
        body.put("contactPhone", "0788 100 200");
        body.put("adminFullName", "Valid Admin");
        body.put("adminNationalId", "1199" + digits(12));
        body.put("adminEmployeeId", "VC-001");
        body.put("adminEmail", "a-" + suffix + "@test.rw");
        body.put("adminPhone", "+250 788 100 201");
        body.put("password", PASSWORD);
        return body;
    }

    @Test
    void registrationEnforcesFieldFormats() throws Exception {
        assertStatus(postJson("/auth/register", null, validRegistration()), 201);

        assertInvalid("adminNationalId", "12345");
        assertInvalid("adminNationalId", "11990000000000AB");
        assertInvalid("adminPhone", "12345");
        assertInvalid("contactPhone", "0712 345 678"); // 071 is not a Rwandan mobile prefix
        assertInvalid("password", "abcdefgh"); // no number
        assertInvalid("password", "12345678"); // no letter
        assertInvalid("adminEmail", "not-an-email");
        assertInvalid("adminEmployeeId", "has spaces in it");
    }

    private void assertInvalid(String field, String value) throws Exception {
        Map<String, Object> body = validRegistration();
        body.put(field, value);
        Response response = postJson("/auth/register", null, body);
        assertThat(response.status()).as("%s=%s", field, value).isEqualTo(400);
        assertThat(response.body().get("details").has(field)).as("details name %s", field).isTrue();
    }

    @Test
    void depositAmountLimitsAreEnforced() throws Exception {
        Org org = registerVerifiedOrg();
        Member member = createMember(org, "Saver");
        String path = "/members/" + member.id() + "/savings/voluntary";

        assertThat(postJson(path, member.token(), Map.of("amountRwf", 50, "source", "x")).status()).isEqualTo(400);
        assertThat(postJson(path, member.token(), Map.of("amountRwf", 60_000_000, "source", "x")).status()).isEqualTo(400);
    }

    @Test
    void demoModeLabelsSelfServiceDepositsButNotStaffRecordedOnes() throws Exception {
        assertThat(getJson("/config", null).body().get("paymentsMode").asText()).isEqualTo("demo");

        Org org = registerVerifiedOrg();
        Member member = createMember(org, "Demo Saver");
        String path = "/members/" + member.id() + "/savings/voluntary";

        JsonNode self = postJson(path, member.token(), Map.of("amountRwf", 5000, "source", "Member Self-Service")).body();
        JsonNode staff = postJson(path, org.adminToken(), Map.of("amountRwf", 7000, "source", "cash")).body();

        assertThat(self.toString()).contains(PaymentsMode.DEMO_SOURCE);
        assertThat(staff.toString()).doesNotContain(PaymentsMode.DEMO_SOURCE).contains("cash");
    }

    @Test
    void disabledModeRefusesSelfService() {
        PaymentsMode disabled = new PaymentsMode("disabled");

        assertThat(disabled.isDemo()).isFalse();
        assertThatThrownBy(disabled::requireSelfServiceAllowed)
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("office");
    }
}
