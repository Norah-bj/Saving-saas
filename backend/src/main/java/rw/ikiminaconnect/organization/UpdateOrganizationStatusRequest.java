package rw.ikiminaconnect.organization;

import jakarta.validation.constraints.NotNull;

public record UpdateOrganizationStatusRequest(@NotNull OrganizationStatus status) {
}
