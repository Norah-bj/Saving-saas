package rw.ikiminaconnect.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Organization self-signup: creates the tenant and its first user in one
 * call, with that user holding both org-admin and member roles (mirrors the
 * "every admin is also a member" rule). Policy settings (share value,
 * interest/insurance rates, etc.) default to sane platform defaults here —
 * see AuthService — and are editable later via organization settings, which
 * is a later roadmap phase, not this slice.
 */
public record RegisterRequest(
        @NotBlank String organizationName,
        @NotBlank @Size(max = 40) String organizationShortName,
        @NotBlank String district,
        @NotBlank String sector,
        @NotBlank String address,
        @NotBlank @Email String contactEmail,
        @NotBlank String contactPhone,

        @NotBlank String adminFullName,
        @NotBlank String adminNationalId,
        @NotBlank String adminEmployeeId,
        @NotBlank @Email String adminEmail,
        @NotBlank String adminPhone,
        @NotBlank @Size(min = 8) String password) {
}
