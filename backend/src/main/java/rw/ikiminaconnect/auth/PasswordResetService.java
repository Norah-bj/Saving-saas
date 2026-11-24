package rw.ikiminaconnect.auth;

import java.time.Duration;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rw.ikiminaconnect.audit.AuditService;
import rw.ikiminaconnect.common.ForbiddenException;
import rw.ikiminaconnect.email.EmailService;
import rw.ikiminaconnect.member.AppUser;
import rw.ikiminaconnect.member.MemberRepository;
import rw.ikiminaconnect.member.MemberStatus;

/**
 * Self-service password reset (gap-closure phase 9) — replaces a frontend
 * page that claimed to send a reset email but called nothing.
 *
 * <p>{@link #requestReset} behaves identically whether or not the address
 * belongs to an account, so it can't be used to discover who is registered.
 * Accounts that can't sign in anyway get nothing: exited members, and
 * staff-added members who haven't accepted their invite yet (they need their
 * invite link, which staff can re-send). A completed reset revokes every
 * refresh token, so other sessions can't be renewed (an already-issued access
 * token stays valid until it expires, at most 15 minutes).
 */
@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

    private final MemberRepository memberRepository;
    private final AccountTokenService tokenService;
    private final RefreshTokenService refreshTokenService;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final Duration ttl;
    private final String frontendUrl;

    public PasswordResetService(
            MemberRepository memberRepository,
            AccountTokenService tokenService,
            RefreshTokenService refreshTokenService,
            EmailService emailService,
            PasswordEncoder passwordEncoder,
            AuditService auditService,
            @Value("${app.password-reset.ttl-minutes:60}") long ttlMinutes,
            @Value("${app.frontend-url}") String frontendUrl) {
        this.memberRepository = memberRepository;
        this.tokenService = tokenService;
        this.refreshTokenService = refreshTokenService;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
        this.ttl = Duration.ofMinutes(ttlMinutes);
        this.frontendUrl = frontendUrl;
    }

    @Transactional
    public void requestReset(String email) {
        // Same lookup as login, so an address that can sign in can also reset.
        AppUser user = memberRepository.findByEmail(email.trim()).orElse(null);
        if (user == null || user.isInvitePending() || user.getStatus() == MemberStatus.exited) {
            return;
        }
        String rawToken = tokenService.issue(user.getId(), AccountToken.Purpose.PASSWORD_RESET, ttl);
        String link = frontendUrl + "/reset-password?token=" + rawToken;
        try {
            emailService.sendPasswordResetEmail(user.getEmail(), user.getFullName(), link);
        } catch (RuntimeException e) {
            log.warn("Password reset email to user {} could not be sent: {}", user.getId(), e.getMessage());
        }
        auditService.record(user.getOrganizationId(), user.getId(), user.getFullName(),
                "Requested password reset", user.getEmail());
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        UUID userId = tokenService.consume(rawToken, AccountToken.Purpose.PASSWORD_RESET,
                "This password reset link is invalid, has expired, or was already used. Request a new one.");
        AppUser user = memberRepository.findById(userId)
                .orElseThrow(() -> new ForbiddenException("User no longer exists."));
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        memberRepository.save(user);
        refreshTokenService.revokeAllForUser(user.getId());
        auditService.record(user.getOrganizationId(), user.getId(), user.getFullName(),
                "Reset password", user.getEmail());
    }
}
