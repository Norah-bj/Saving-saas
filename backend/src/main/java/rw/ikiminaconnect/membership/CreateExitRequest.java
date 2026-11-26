package rw.ikiminaconnect.membership;

import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotBlank;

public record CreateExitRequest(@NotBlank @Size(max = 500) String reason) {
}
