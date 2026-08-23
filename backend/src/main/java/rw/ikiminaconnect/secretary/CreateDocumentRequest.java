package rw.ikiminaconnect.secretary;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateDocumentRequest(
        @NotBlank String name,
        @NotNull DocumentCategory category,
        @NotNull DocumentFileType fileType,
        @NotNull @Min(1) Integer sizeKb,
        @NotNull DocumentVisibility visibility) {
}
