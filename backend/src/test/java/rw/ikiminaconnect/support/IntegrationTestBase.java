package rw.ikiminaconnect.support;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Base for API-level integration tests: the real Spring context, real security
 * filter chain, and real Flyway-migrated PostgreSQL 17 (a throwaway Docker
 * container via Testcontainers — never the developer's own database).
 *
 * <p>One container is started per JVM (singleton pattern) and shared by every
 * test class, so Spring's context cache also reuses one application context.
 * Tests isolate themselves by data instead of by database: each test registers
 * its own fresh organization with unique emails/IDs, so tests never see each
 * other's rows and can run in any order.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(RecordingEmailService.Config.class)
public abstract class IntegrationTestBase {

    protected static final String PASSWORD = "TestPass123!";

    // Deliberately never closed: one container is shared by the whole test run
    // (singleton pattern), and Testcontainers' Ryuk sidecar removes it when the
    // JVM exits. Closing it per class would restart PostgreSQL for every class.
    @SuppressWarnings("resource")
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17-alpine")
            .withDatabaseName("ikiminaconnect")
            .withUsername("ikiminaconnect")
            .withPassword("ikiminaconnect_test");

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) throws Exception {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("app.backup.db-host", POSTGRES::getHost);
        registry.add("app.backup.db-port", () -> POSTGRES.getMappedPort(PostgreSQLContainer.POSTGRESQL_PORT));
        registry.add("app.backup.db-name", POSTGRES::getDatabaseName);
        String backupDir = Files.createTempDirectory("ikimina-test-backups").toString();
        registry.add("app.backup.directory", () -> backupDir);
        registry.add("app.super-admin-bootstrap-token", () -> BOOTSTRAP_TOKEN);
    }

    private static final String BOOTSTRAP_TOKEN = "test-bootstrap-" + UUID.randomUUID();
    private static final String SUPER_ADMIN_EMAIL = "superadmin@test.rw";
    private static boolean superAdminProvisioned;

    /**
     * Logs in as the platform SUPER_ADMIN, provisioning it through the real
     * one-time bootstrap endpoint the first time any test asks (the shared
     * database only ever allows one).
     */
    protected synchronized String superAdminToken() throws Exception {
        if (!superAdminProvisioned) {
            Response response = postJson("/auth/bootstrap-super-admin", null, Map.of(
                    "token", BOOTSTRAP_TOKEN,
                    "fullName", "Test Platform Operator",
                    "nationalId", "1197" + digits(12),
                    "employeeId", "OPS-1",
                    "email", SUPER_ADMIN_EMAIL,
                    "phone", "0788" + digits(6),
                    "password", PASSWORD));
            assertStatus(response, 201);
            superAdminProvisioned = true;
        }
        return login(SUPER_ADMIN_EMAIL, PASSWORD);
    }

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected RecordingEmailService emails;

    // ---------------------------------------------------------------- HTTP

    /** A finished request: status plus parsed JSON body (null when empty). */
    protected record Response(int status, JsonNode body) {
        public String message() {
            return body == null || body.get("message") == null ? "" : body.get("message").asText();
        }
    }

    protected Response getJson(String path, String token) throws Exception {
        return perform(get(api(path)), token);
    }

    protected Response postJson(String path, String token, Object body) throws Exception {
        return perform(withBody(post(api(path)), body), token);
    }

    protected Response putJson(String path, String token, Object body) throws Exception {
        return perform(withBody(put(api(path)), body), token);
    }

    protected Response patchJson(String path, String token, Object body) throws Exception {
        return perform(withBody(patch(api(path)), body), token);
    }

    protected Response upload(String path, String token, String fileName, byte[] content) throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", fileName, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", content);
        return perform(multipart(api(path)).file(file), token);
    }

    private MockHttpServletRequestBuilder withBody(MockHttpServletRequestBuilder builder, Object body)
            throws Exception {
        builder.contentType(MediaType.APPLICATION_JSON);
        if (body != null) {
            builder.content(objectMapper.writeValueAsString(body));
        }
        return builder;
    }

    private Response perform(MockHttpServletRequestBuilder builder, String token) throws Exception {
        if (token != null) {
            builder.header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
        }
        MvcResult result = mvc.perform(builder).andReturn();
        String contentType = result.getResponse().getContentType();
        String content = result.getResponse().getContentAsString();
        boolean isJson = contentType != null && contentType.contains("json") && !content.isBlank();
        return new Response(result.getResponse().getStatus(), isJson ? objectMapper.readTree(content) : null);
    }

    private static String api(String path) {
        return "/api/v1" + path;
    }

    // ------------------------------------------------------------ fixtures

    /** A freshly registered organization and its (email-verified) first ORG_ADMIN. */
    protected record Org(UUID id, UUID adminId, String adminEmail, String adminToken) {
    }

    /** A member created by staff, plus a token from logging in as them. */
    protected record Member(UUID id, String email, String employeeId, String token) {
    }

    protected static String unique() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    private static String digits(int length) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < length; i++) {
            sb.append(ThreadLocalRandom.current().nextInt(10));
        }
        return sb.toString();
    }

    /** Registers a new org via the public endpoint, then verifies the admin's email for real. */
    protected Org registerVerifiedOrg() throws Exception {
        String suffix = unique();
        String adminEmail = "admin-" + suffix + "@test.rw";
        Response registered = postJson("/auth/register", null, Map.ofEntries(
                Map.entry("organizationName", "Test Cooperative " + suffix),
                Map.entry("organizationShortName", "TC" + suffix),
                Map.entry("district", "Gasabo"),
                Map.entry("sector", "Remera"),
                Map.entry("address", "KG 1 Ave"),
                Map.entry("contactEmail", "contact-" + suffix + "@test.rw"),
                Map.entry("contactPhone", "0788" + digits(6)),
                Map.entry("adminFullName", "Admin " + suffix),
                Map.entry("adminNationalId", "1199" + digits(12)),
                Map.entry("adminEmployeeId", "ADM-" + suffix),
                Map.entry("adminEmail", adminEmail),
                Map.entry("adminPhone", "0788" + digits(6)),
                Map.entry("password", PASSWORD)));
        assertStatus(registered, 201);

        Response verified = postJson("/auth/verify-email", null, Map.of("token", emails.tokenFor(adminEmail)));
        assertStatus(verified, 204);

        JsonNode user = registered.body().get("user");
        return new Org(
                UUID.fromString(user.get("organizationId").asText()),
                UUID.fromString(user.get("id").asText()),
                adminEmail,
                login(adminEmail, PASSWORD));
    }

    /** Creates a member as staff, sets their password via the returned temporary one, and logs in. */
    protected Member createMember(Org org, String fullName) throws Exception {
        String suffix = unique();
        String email = "m-" + suffix + "@test.rw";
        String employeeId = "EMP-" + suffix;
        Response created = postJson("/members", org.adminToken(), Map.of(
                "nationalId", "1198" + digits(12),
                "employeeId", employeeId,
                "fullName", fullName,
                "email", email,
                "phone", "0788" + digits(6),
                "department", "Operations",
                "position", "Officer",
                "monthlySalaryRwf", 400_000));
        assertStatus(created, 201);
        UUID id = UUID.fromString(created.body().get("member").get("id").asText());
        String temporaryPassword = created.body().get("temporaryPassword").asText();
        return new Member(id, email, employeeId, login(email, temporaryPassword));
    }

    /** Replaces a user's roles (ORG_ADMIN action). Roles live in the JWT, so callers must log in again. */
    protected void setRoles(Org org, UUID userId, List<String> roles) throws Exception {
        assertStatus(putJson("/members/" + userId + "/roles", org.adminToken(), Map.of("roles", roles)), 200);
    }

    protected String login(String email, String password) throws Exception {
        Response response = postJson("/auth/login", null, Map.of("email", email, "password", password));
        assertStatus(response, 200);
        return response.body().get("accessToken").asText();
    }

    protected static void assertStatus(Response response, int expected) {
        if (response.status() != expected) {
            throw new AssertionError("Expected HTTP " + expected + " but got " + response.status()
                    + " with body: " + response.body());
        }
    }
}
