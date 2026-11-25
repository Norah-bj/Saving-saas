package rw.ikiminaconnect.auth;

import java.time.Duration;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rw.ikiminaconnect.email.EmailService;
import rw.ikiminaconnect.member.AppUser;

/**
 * Staff invites (gap-closure phase 9): a member added by staff gets a
 * single-use, expiring link to choose their own password, instead of a
 * temporary password the admin passes on by hand.
 *
 * <p>Sending the email is best-effort. If the provider rejects it (Resend's
 * test sender only delivers to the account owner until a domain is verified)
 * or is down, the invite still exists and the raw link is returned to the
 * staff member who created it, so they can share it another way (WhatsApp,
 * SMS). Returning the link to the admin is no weaker than the temporary
 * password it replaces, and it's single-use, expiring and lets the member pick
 * their own password.
 */
@Service
public class InviteService {

    private static final Logger log = LoggerFactory.getLogger(InviteService.class);

    private final AccountTokenService tokenService;
    private final EmailService emailService;
    private final Duration ttl;
    private final String frontendUrl;

    public InviteService(
            AccountTokenService tokenService,
            EmailService emailService,
            @Value("${app.invite.ttl-hours:72}") long ttlHours,
            @Value("${app.frontend-url}") String frontendUrl) {
        this.tokenService = tokenService;
        this.emailService = emailService;
        this.ttl = Duration.ofHours(ttlHours);
        this.frontendUrl = frontendUrl;
    }

    /** The link to share and whether the invitation email was accepted by the provider. */
    public record InviteResult(String inviteLink, boolean emailSent) {
    }

    /** Retires any earlier open invite for this user, issues a fresh one and tries to email it. */
    @Transactional
    public InviteResult issue(AppUser user, String organizationName) {
        String rawToken = tokenService.issue(user.getId(), AccountToken.Purpose.INVITE, ttl);
        String link = frontendUrl + "/accept-invite?token=" + rawToken;
        boolean emailSent;
        try {
            emailService.sendInviteEmail(user.getEmail(), user.getFullName(), organizationName, link);
            emailSent = true;
        } catch (RuntimeException e) {
            // Never fail member creation over email delivery — the link is returned instead.
            log.warn("Invite email to user {} could not be sent: {}", user.getId(), e.getMessage());
            emailSent = false;
        }
        return new InviteResult(link, emailSent);
    }

    /** Validates and consumes an invite token. Returns the invited user's id. */
    @Transactional
    public UUID consume(String rawToken) {
        return tokenService.consume(rawToken, AccountToken.Purpose.INVITE,
                "This invitation link is invalid, has expired, or was already used. "
                        + "Ask your organization's secretary or administrator for a new one.");
    }
}
