package rw.ikiminaconnect.secretary;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateDocumentRequest(
        @NotBlank @Size(max = 120) String name,
        @NotNull DocumentCategory category,
        @NotNull DocumentFileType fileType,
        @NotNull @Min(1) @Max(102400) Integer sizeKb,
        @NotNull DocumentVisibility visibility) {
}
