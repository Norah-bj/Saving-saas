package rw.ikiminaconnect.secretary;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateAnnouncementRequest(
        @NotBlank String title,
        @NotBlank String body,
        @NotNull AnnouncementPriority priority,
        @NotNull AnnouncementAudience audience) {
}
