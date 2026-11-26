package rw.ikiminaconnect.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import rw.ikiminaconnect.common.ValidationRules;

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
        @NotBlank @Pattern(regexp = ValidationRules.NATIONAL_ID, message = ValidationRules.NATIONAL_ID_MESSAGE) String nationalId,
        @NotBlank @Size(max = 40) String employeeId,
        @NotBlank @Email String email,
        @NotBlank @Pattern(regexp = ValidationRules.PHONE, message = ValidationRules.PHONE_MESSAGE) String phone,
        @NotBlank @Pattern(regexp = ValidationRules.PASSWORD, message = ValidationRules.PASSWORD_MESSAGE) String password) {
}
