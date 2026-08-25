package rw.ikiminaconnect.backup;

import jakarta.validation.constraints.NotBlank;

public record CreateBackupRequest(@NotBlank String label) {
}
