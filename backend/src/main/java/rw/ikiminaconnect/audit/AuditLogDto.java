package rw.ikiminaconnect.audit;

import java.time.Instant;
import java.util.UUID;

public record AuditLogDto(
        UUID id, UUID organizationId, String actorName, String action, String target, Instant occurredAt) {

    public static AuditLogDto from(AuditLogEntry e) {
        return new AuditLogDto(e.getId(), e.getOrganizationId(), e.getActorName(), e.getAction(),
                e.getTarget(), e.getOccurredAt());
    }
}
