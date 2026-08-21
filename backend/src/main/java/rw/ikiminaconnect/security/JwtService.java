package rw.ikiminaconnect.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import rw.ikiminaconnect.member.AppUser;
import rw.ikiminaconnect.member.UserRoleAssignment;

/**
 * Issues and parses the short-lived JWT access token. Refresh tokens are
 * deliberately NOT JWTs — see {@link rw.ikiminaconnect.auth.RefreshTokenService}
 * for why (opaque, hashed, revocable server-side).
 */
@Service
public class JwtService {

    private static final String CLAIM_ORGANIZATION_ID = "organizationId";
    private static final String CLAIM_ROLES = "roles";
    private static final String CLAIM_COMMITTEE_CHAIR = "committeeChair";
    private static final String CLAIM_FULL_NAME = "fullName";

    private final Key signingKey;
    private final Duration accessTokenTtl;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-token-ttl-minutes}") long accessTokenTtlMinutes) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenTtl = Duration.ofMinutes(accessTokenTtlMinutes);
    }

    public String issueAccessToken(AppUser user) {
        Instant now = Instant.now();
        Set<String> roleValues = user.getRoles().stream()
                .map(UserRoleAssignment::getRole)
                .map(role -> role.toValue())
                .collect(Collectors.toSet());

        var builder = Jwts.builder()
                .subject(user.getId().toString())
                .claim(CLAIM_ROLES, List.copyOf(roleValues))
                .claim(CLAIM_COMMITTEE_CHAIR, user.isCommitteeChair())
                .claim(CLAIM_FULL_NAME, user.getFullName())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(accessTokenTtl)));

        if (user.getOrganizationId() != null) {
            builder.claim(CLAIM_ORGANIZATION_ID, user.getOrganizationId().toString());
        }

        return builder.signWith(signingKey).compact();
    }

    public long accessTokenTtlSeconds() {
        return accessTokenTtl.toSeconds();
    }

    /** Throws io.jsonwebtoken.JwtException (or a subclass) on any invalid/expired token. */
    public Claims parseAndValidate(String token) {
        return Jwts.parser()
                .verifyWith((javax.crypto.SecretKey) signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public static String organizationId(Claims claims) {
        return claims.get(CLAIM_ORGANIZATION_ID, String.class);
    }

    @SuppressWarnings("unchecked")
    public static List<String> roles(Claims claims) {
        return claims.get(CLAIM_ROLES, List.class);
    }

    public static boolean committeeChair(Claims claims) {
        Boolean value = claims.get(CLAIM_COMMITTEE_CHAIR, Boolean.class);
        return Boolean.TRUE.equals(value);
    }

    public static String fullName(Claims claims) {
        return claims.get(CLAIM_FULL_NAME, String.class);
    }
}
