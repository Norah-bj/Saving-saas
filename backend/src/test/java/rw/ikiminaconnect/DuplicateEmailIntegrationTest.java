package rw.ikiminaconnect;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;
import rw.ikiminaconnect.support.IntegrationTestBase;

/**
 * Found during manual pre-hosting testing: registering (or adding a member)
 * with an email that already has an account hit the database's unique
 * constraint and surfaced as a 500 "Something went wrong". It must be a 409
 * with a message the person can act on.
 */
class DuplicateEmailIntegrationTest extends IntegrationTestBase {

    @Test
    void registeringWithAnEmailInUseIsAClearConflict() throws Exception {
        Org existing = registerVerifiedOrg();
        String suffix = unique();

        Response response = postJson("/auth/register", null, Map.ofEntries(
                Map.entry("organizationName", "Second Coop " + suffix),
                Map.entry("organizationShortName", "SC" + suffix),
                Map.entry("district", "Gasabo"),
                Map.entry("sector", "Remera"),
                Map.entry("address", "KG 1 Ave"),
                Map.entry("contactEmail", "c-" + suffix + "@test.rw"),
                Map.entry("contactPhone", "0788000001"),
                Map.entry("adminFullName", "Second Admin"),
                Map.entry("adminNationalId", "1197" + System.nanoTime() % 1_000_000_000_000L),
                Map.entry("adminEmployeeId", "SC-1"),
                Map.entry("adminEmail", existing.adminEmail()),
                Map.entry("adminPhone", "0788000002"),
                Map.entry("password", PASSWORD)));

        assertThat(response.status()).isEqualTo(409);
        assertThat(response.message()).contains("email");
    }

    @Test
    void addingAMemberWithAnEmailInUseIsAClearConflict() throws Exception {
        Org org = registerVerifiedOrg();
        Member existing = createMember(org, "Existing Person");

        Response response = postJson("/members", org.adminToken(), Map.of(
                "nationalId", "1196" + System.nanoTime() % 1_000_000_000_000L,
                "employeeId", "DUP-" + unique(),
                "fullName", "Someone Else",
                "email", existing.email(),
                "phone", "0788000003",
                "department", "Ops",
                "position", "Clerk",
                "monthlySalaryRwf", 100000));

        assertThat(response.status()).isEqualTo(409);
        assertThat(response.message()).contains("email");
    }
}
