package rw.ikiminaconnect.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import rw.ikiminaconnect.common.ApiError;
import rw.ikiminaconnect.member.MemberRepository;

/**
 * Blocks every request from an authenticated-but-unverified user, except a
 * small allowlist (auth endpoints, own profile). Registration used to
 * activate a self-signed-up org-admin immediately with no proof of email
 * ownership — this closes that gap without adding manual review, per the
 * user's explicit instruction: instant self-service registration stays, but
 * sensitive data/actions are off-limits until the registering email is
 * confirmed. See docs/BUSINESS_RULES.md.
 *
 * <p>Runs after {@link JwtAuthenticationFilter} so {@code SecurityContext}
 * is already populated. Deliberately re-checks the DB rather than trusting a
 * JWT claim — a user who just clicked the verification link should be
 * unblocked immediately, not after their next token refresh (mirrors the
 * "re-read fine-grained checks fresh from the DB" rule already used for
 * committee-chair status). Writes the 403 body directly, the same way
 * SecurityConfig's authenticationEntryPoint does, since this runs as a raw
 * servlet filter, before Spring MVC's exception-handling machinery.
 */
public class EmailVerificationFilter extends OncePerRequestFilter {

    private final MemberRepository memberRepository;
    private final ObjectMapper objectMapper;

    public EmailVerificationFilter(MemberRepository memberRepository, ObjectMapper objectMapper) {
        this.memberRepository = memberRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {
        if (isAllowlisted(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!(authentication != null && authentication.getPrincipal() instanceof CurrentUser principal)) {
            // Unauthenticated: let SecurityConfig's access rules produce the 401.
            filterChain.doFilter(request, response);
            return;
        }

        // Platform super-admins are provisioned directly by the platform, never
        // through self-service registration — no email-ownership gap to close.
        if (principal.isSuperAdmin() || memberRepository.existsByIdAndEmailVerifiedTrue(principal.userId())) {
            filterChain.doFilter(request, response);
            return;
        }

        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(objectMapper.writeValueAsString(ApiError.of(
                "email_not_verified", "Please verify your email address to access this resource.")));
    }

    private boolean isAllowlisted(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (path.startsWith("/api/v1/auth/") || path.equals("/actuator/health") || path.equals("/error")) {
            return true;
        }
        return path.equals("/api/v1/me") && "GET".equalsIgnoreCase(request.getMethod());
    }
}
