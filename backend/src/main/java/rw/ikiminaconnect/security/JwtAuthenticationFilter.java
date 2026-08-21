package rw.ikiminaconnect.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import rw.ikiminaconnect.tenant.TenantContext;

/**
 * Validates the {@code Authorization: Bearer} JWT on every request, sets both
 * the Spring Security {@code Authentication} (for {@code @PreAuthorize}) and
 * {@link TenantContext} (for tenant-scoped queries) from its claims. Clears
 * TenantContext in a finally block — mandatory, since servlet container
 * threads are pooled and reused across requests.
 *
 * <p>No token, or an invalid one, simply leaves the request unauthenticated —
 * Spring Security's access rules (see SecurityConfig) reject it from there.
 * This filter never itself returns 401/403.
 */
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {
        try {
            String header = request.getHeader("Authorization");
            if (header != null && header.startsWith("Bearer ")) {
                authenticate(header.substring("Bearer ".length()));
            }
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
            SecurityContextHolder.clearContext();
        }
    }

    private void authenticate(String token) {
        try {
            Claims claims = jwtService.parseAndValidate(token);
            UUID userId = UUID.fromString(claims.getSubject());
            String orgIdStr = JwtService.organizationId(claims);
            UUID organizationId = orgIdStr == null ? null : UUID.fromString(orgIdStr);
            List<String> roleValues = JwtService.roles(claims);
            boolean committeeChair = JwtService.committeeChair(claims);
            String fullName = JwtService.fullName(claims);

            Set<String> roles = Set.copyOf(roleValues);
            CurrentUser principal = new CurrentUser(userId, organizationId, roles, committeeChair, fullName);

            List<GrantedAuthority> authorities = roles.stream()
                    .map(r -> new SimpleGrantedAuthority("ROLE_" + r.toUpperCase().replace('-', '_')))
                    .collect(Collectors.toList());

            var authentication = new UsernamePasswordAuthenticationToken(principal, null, authorities);
            SecurityContextHolder.getContext().setAuthentication(authentication);

            TenantContext.set(organizationId, roles.contains("super-admin"));
        } catch (JwtException | IllegalArgumentException ex) {
            // Invalid/expired/malformed token: leave unauthenticated, don't throw here —
            // SecurityConfig's access rules produce the 401/403, keeping this filter's
            // job strictly "populate context if the token is valid."
        }
    }
}
