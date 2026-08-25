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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rw.ikiminaconnect.common.ForbiddenException;
import rw.ikiminaconnect.email.EmailService;
import rw.ikiminaconnect.member.AppUser;

@Service
public class EmailVerificationService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final EmailVerificationTokenRepository tokenRepository;
    private final EmailService emailService;
    private final Duration ttl;
    private final String frontendUrl;

    public EmailVerificationService(
            EmailVerificationTokenRepository tokenRepository,
            EmailService emailService,
            @Value("${app.email-verification.ttl-hours}") long ttlHours,
            @Value("${app.frontend-url}") String frontendUrl) {
        this.tokenRepository = tokenRepository;
        this.emailService = emailService;
        this.ttl = Duration.ofHours(ttlHours);
        this.frontendUrl = frontendUrl;
    }

    /** Issues a new token and sends the verification email. Old tokens for this user are left to expire naturally. */
    @Transactional
    public void issueAndSend(AppUser user) {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        EmailVerificationToken entity = new EmailVerificationToken(user.getId(), hash(rawToken), Instant.now().plus(ttl));
        tokenRepository.save(entity);

        String link = frontendUrl + "/verify-email?token=" + rawToken;
        emailService.sendVerificationEmail(user.getEmail(), user.getFullName(), link);
    }

    /** Validates and consumes the token. Returns the user id it belonged to. */
    @Transactional
    public UUID verify(String rawToken) {
        EmailVerificationToken token = tokenRepository.findByTokenHash(hash(rawToken))
                .filter(EmailVerificationToken::isUsable)
                .orElseThrow(() -> new ForbiddenException("This verification link is invalid or has expired."));
        token.markUsed();
        tokenRepository.save(token);
        return token.getUserId();
    }

    private static String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
