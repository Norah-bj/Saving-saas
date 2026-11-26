package rw.ikiminaconnect.secretary;

import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateAnnouncementRequest(
        @NotBlank @Size(max = 120) String title,
        @NotBlank @Size(max = 4000) String body,
        @NotNull AnnouncementPriority priority,
        @NotNull AnnouncementAudience audience) {
}
