package rw.ikiminaconnect.auth;

import static rw.ikiminaconnect.common.ValidationRules.*;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Size(min = 2, max = 120) String organizationName,
        @NotBlank @Size(min = 2, max = 40) String organizationShortName,
        @NotBlank @Size(max = 60) String district,
        @NotBlank @Size(max = 60) String sector,
        @NotBlank @Size(max = 200) String address,
        @NotBlank @Email @Size(max = 160) String contactEmail,
        @NotBlank @Pattern(regexp = PHONE, message = PHONE_MESSAGE) String contactPhone,

        @NotBlank @Size(min = 2, max = 120) String adminFullName,
        @NotBlank @Pattern(regexp = NATIONAL_ID, message = NATIONAL_ID_MESSAGE) String adminNationalId,
        @NotBlank @Pattern(regexp = EMPLOYEE_ID, message = EMPLOYEE_ID_MESSAGE) String adminEmployeeId,
        @NotBlank @Email @Size(max = 160) String adminEmail,
        @NotBlank @Pattern(regexp = PHONE, message = PHONE_MESSAGE) String adminPhone,
        @NotBlank @Pattern(regexp = PASSWORD, message = PASSWORD_MESSAGE) String password) {
}
