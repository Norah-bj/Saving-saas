package rw.ikiminaconnect.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Provisions the platform's first (and, in practice, only ever automatically
 * created) SUPER_ADMIN. {@code token} must match {@code app.super-admin-
 * bootstrap-token} (unset by default — the endpoint refuses everything
 * until an operator explicitly configures one); it is not a JWT and never
 * appears in an access token. See AuthService.bootstrapSuperAdmin() and
 * docs/DEVELOPMENT.md.
 */
public record BootstrapSuperAdminRequest(
        @NotBlank String token,
        @NotBlank String fullName,
        @NotBlank String nationalId,
        @NotBlank String employeeId,
        @NotBlank @Email String email,
        @NotBlank String phone,
        @NotBlank @Size(min = 8) String password) {
}
