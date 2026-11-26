package rw.ikiminaconnect;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;
import rw.ikiminaconnect.support.IntegrationTestBase;

/** Organization logo upload, public display, type/size checks and permissions. */
class OrganizationLogoIntegrationTest extends IntegrationTestBase {

    private static final byte[] PNG = pngOfSize(200);

    private static byte[] pngOfSize(int size) {
        byte[] bytes = new byte[size];
        byte[] signature = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'};
        System.arraycopy(signature, 0, bytes, 0, signature.length);
        Arrays.fill(bytes, signature.length, size, (byte) 7);
        return bytes;
    }

    private MvcResult put(String orgId, String token, String fileName, byte[] content) throws Exception {
        var request = multipart(HttpMethod.PUT, "/api/v1/organizations/" + orgId + "/logo")
                .file(new MockMultipartFile("file", fileName, "image/png", content));
        if (token != null) {
            request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
        }
        return mvc.perform(request).andReturn();
    }

    @Test
    void adminUploadsALogoThatAnyoneCanDisplayAndCanRemoveIt() throws Exception {
        Org org = registerVerifiedOrg();
        String id = org.id().toString();

        assertThat(getJson("/organizations/" + id, org.adminToken()).body().get("logoUpdatedAt").isNull()).isTrue();

        MvcResult uploaded = put(id, org.adminToken(), "logo.png", PNG);
        assertThat(uploaded.getResponse().getStatus()).isEqualTo(200);
        assertThat(objectMapper.readTree(uploaded.getResponse().getContentAsString()).get("logoUpdatedAt").isNull())
                .isFalse();

        // Public: no token needed, served with the detected type and nosniff.
        MvcResult shown = mvc.perform(get("/api/v1/organizations/" + id + "/logo")).andReturn();
        assertThat(shown.getResponse().getStatus()).isEqualTo(200);
        assertThat(shown.getResponse().getContentType()).isEqualTo("image/png");
        assertThat(shown.getResponse().getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(shown.getResponse().getContentAsByteArray()).isEqualTo(PNG);

        var deleted = mvc.perform(delete("/api/v1/organizations/" + id + "/logo")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + org.adminToken())).andReturn();
        assertThat(deleted.getResponse().getStatus()).isEqualTo(200);
        assertThat(mvc.perform(get("/api/v1/organizations/" + id + "/logo")).andReturn().getResponse().getStatus())
                .isEqualTo(404);
    }

    @Test
    void onlyRealImagesWithinTheSizeLimitAreAccepted() throws Exception {
        Org org = registerVerifiedOrg();
        String id = org.id().toString();
        byte[] svg = "<svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert(1)</script></svg>"
                .getBytes(StandardCharsets.UTF_8);

        assertThat(put(id, org.adminToken(), "logo.png", "not an image".getBytes(StandardCharsets.UTF_8))
                .getResponse().getStatus()).isEqualTo(400);
        assertThat(put(id, org.adminToken(), "logo.png", svg).getResponse().getStatus()).isEqualTo(400);
        assertThat(put(id, org.adminToken(), "big.png", pngOfSize(1024 * 1024 + 1)).getResponse().getStatus())
                .isEqualTo(400);
    }

    @Test
    void onlyThisOrganizationsAdminCanChangeItsLogo() throws Exception {
        Org org = registerVerifiedOrg();
        Org other = registerVerifiedOrg();
        Member member = createMember(org, "Plain Member");
        String id = org.id().toString();

        assertThat(put(id, member.token(), "logo.png", PNG).getResponse().getStatus()).isEqualTo(403);
        assertThat(put(id, other.adminToken(), "logo.png", PNG).getResponse().getStatus()).isEqualTo(403);
        assertThat(put(id, null, "logo.png", PNG).getResponse().getStatus()).isEqualTo(401);
    }
}
