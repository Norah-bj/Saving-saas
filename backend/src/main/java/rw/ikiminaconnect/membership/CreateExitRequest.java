package rw.ikiminaconnect.membership;

import jakarta.validation.constraints.NotBlank;

public record CreateExitRequest(@NotBlank String reason) {
}
