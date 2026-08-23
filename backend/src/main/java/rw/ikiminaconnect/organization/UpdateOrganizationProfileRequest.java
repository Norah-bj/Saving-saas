package rw.ikiminaconnect.organization;

import jakarta.validation.constraints.NotBlank;

public record UpdateOrganizationProfileRequest(
        @NotBlank String name,
        @NotBlank String shortName,
        @NotBlank String district,
        @NotBlank String sector,
        @NotBlank String address,
        @NotBlank String contactEmail,
        @NotBlank String contactPhone,
        @NotBlank String logoInitials,
        @NotBlank String brandColor,
        @NotBlank String stampLabel) {
}
