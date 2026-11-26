package rw.ikiminaconnect.organization;

import static rw.ikiminaconnect.common.ValidationRules.*;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateOrganizationProfileRequest(
        @NotBlank @Size(min = 2, max = 120) String name,
        @NotBlank @Size(min = 2, max = 40) String shortName,
        @NotBlank @Size(max = 60) String district,
        @NotBlank @Size(max = 60) String sector,
        @NotBlank @Size(max = 200) String address,
        @NotBlank @Email @Size(max = 160) String contactEmail,
        @NotBlank @Pattern(regexp = PHONE, message = PHONE_MESSAGE) String contactPhone,
        @NotBlank @Size(min = 1, max = 3) String logoInitials,
        @NotBlank @Pattern(regexp = HEX_COLOR, message = HEX_COLOR_MESSAGE) String brandColor,
        @NotBlank @Size(max = 80) String stampLabel) {
}
