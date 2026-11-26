package rw.ikiminaconnect;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import rw.ikiminaconnect.support.IntegrationTestBase;

/**
 * Bad requests must be reported as client errors (4xx) with a clear body,
 * never as a 500 "server error" — found by the pre-hosting QA pass, where
 * every kind of malformed input fell through to the catch-all handler.
 */
class ErrorHandlingIntegrationTest extends IntegrationTestBase {

    @Test
    void malformedRequestsAreClientErrorsNotServerErrors() throws Exception {
        Org org = registerVerifiedOrg();
        String auth = "Bearer " + org.adminToken();

        assertStatus(get("/api/v1/ledger?type=bogus"), auth, 400);
        assertStatus(get("/api/v1/members/not-a-uuid"), auth, 400);
        assertStatus(post("/api/v1/meetings").contentType(MediaType.APPLICATION_JSON).content("{bad json"), auth, 400);
        assertStatus(post("/api/v1/announcements").contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"t\",\"body\":\"b\",\"priority\":\"mega\",\"audience\":\"all\"}"), auth, 400);
        assertStatus(post("/api/v1/meetings").contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"t\",\"date\":\"not-a-date\",\"time\":\"1\",\"location\":\"x\",\"agenda\":[\"a\"]}"), auth, 400);
        assertStatus(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON), null, 400);
        assertStatus(post("/api/v1/auth/login").contentType(MediaType.TEXT_PLAIN).content("x"), null, 415);
        assertStatus(delete("/api/v1/members"), auth, 405);
        assertStatus(get("/api/v1/does-not-exist"), auth, 404);
    }

    private void assertStatus(MockHttpServletRequestBuilder request, String authorization, int expected) throws Exception {
        if (authorization != null) {
            request.header(HttpHeaders.AUTHORIZATION, authorization);
        }
        MvcResult result = mvc.perform(request).andReturn();
        assertThat(result.getResponse().getStatus())
                .as("%s %s -> body %s", result.getRequest().getMethod(), result.getRequest().getRequestURI(),
                        result.getResponse().getContentAsString())
                .isEqualTo(expected);
        assertThat(result.getResponse().getContentAsString()).contains("\"error\"");
    }
}
