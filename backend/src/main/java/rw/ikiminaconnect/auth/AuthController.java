package rw.ikiminaconnect.auth;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import rw.ikiminaconnect.security.CurrentUser;

@RestController
@RequestMapping("/api/v1")
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;

    public AuthController(AuthService authService, PasswordResetService passwordResetService) {
        this.authService = authService;
        this.passwordResetService = passwordResetService;
    }

    /**
     * Public. Always 204, whether or not the address has an account, so it
     * can't be used to find out who is registered. Emails a 1-hour link.
     */
    @PostMapping("/auth/forgot-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestReset(request.email());
    }

    /** Public — the single-use reset token proves identity. 403 if invalid/expired/used. Signs out other sessions. */
    @PostMapping("/auth/reset-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request.token(), request.password());
    }

    @PostMapping("/auth/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/auth/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/auth/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshRequest request) {
        return authService.refresh(request);
    }

    @PostMapping("/auth/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@Valid @RequestBody RefreshRequest request) {
        authService.logout(request);
    }

    @GetMapping("/me")
    public MeResponse me(@AuthenticationPrincipal CurrentUser currentUser) {
        return authService.me(currentUser.userId());
    }

    @PostMapping("/auth/verify-email")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        authService.verifyEmail(request.token());
    }

    /**
     * Public — the single-use invite token itself proves identity (it was
     * sent to the member's email or shared by their admin). Sets the
     * member's password and signs them in. 403 if the token is invalid,
     * expired or already used.
     */
    @PostMapping("/auth/accept-invite")
    public AuthResponse acceptInvite(@Valid @RequestBody AcceptInviteRequest request) {
        return authService.acceptInvite(request);
    }

    @PostMapping("/auth/resend-verification")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resendVerification(@AuthenticationPrincipal CurrentUser currentUser) {
        authService.resendVerification(currentUser.userId());
    }

    /**
     * Public like register/login (no JWT exists yet the first time this is
     * ever meaningfully callable) — real access control is the bootstrap
     * token, checked in the service layer, plus the fact that it only ever
     * succeeds once. See docs/DEVELOPMENT.md.
     */
    @PostMapping("/auth/bootstrap-super-admin")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse bootstrapSuperAdmin(@Valid @RequestBody BootstrapSuperAdminRequest request) {
        return authService.bootstrapSuperAdmin(request);
    }
}
