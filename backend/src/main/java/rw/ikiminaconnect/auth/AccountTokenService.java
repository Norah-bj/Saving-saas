package rw.ikiminaconnect.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rw.ikiminaconnect.common.ForbiddenException;

/** Issues and consumes single-use account tokens (invites, password resets). */
@Service
public class AccountTokenService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final AccountTokenRepository tokenRepository;

    public AccountTokenService(AccountTokenRepository tokenRepository) {
        this.tokenRepository = tokenRepository;
    }

    /** Retires the user's open tokens of this purpose and returns a fresh raw token (only its hash is stored). */
    @Transactional
    public String issue(UUID userId, AccountToken.Purpose purpose, Duration ttl) {
        tokenRepository.retireOpen(userId, purpose, Instant.now());
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        tokenRepository.save(new AccountToken(userId, purpose, hash(rawToken), Instant.now().plus(ttl)));
        return rawToken;
    }

    /** Validates and consumes a token of the given purpose; returns its user id or throws 403 with {@code invalidMessage}. */
    @Transactional
    public UUID consume(String rawToken, AccountToken.Purpose purpose, String invalidMessage) {
        AccountToken token = tokenRepository.findByTokenHashAndPurpose(hash(rawToken), purpose)
                .filter(AccountToken::isUsable)
                .orElseThrow(() -> new ForbiddenException(invalidMessage));
        token.markUsed();
        tokenRepository.save(token);
        return token.getUserId();
    }

    private static String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
