package rw.ikiminaconnect.backup;

import java.time.Instant;
import java.util.UUID;

public record BackupDto(
        UUID id, UUID organizationId, String label, BackupType type, Integer sizeMb,
        String createdBy, Instant createdAt) {

    public static BackupDto from(BackupRecord b) {
        return new BackupDto(b.getId(), b.getOrganizationId(), b.getLabel(), b.getType(),
                b.getSizeMb(), b.getCreatedBy(), b.getCreatedAt());
    }
}
