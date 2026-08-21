package rw.ikiminaconnect.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.UuidGenerator;

/**
 * Append-only. {@code organizationId} is nullable — null means a
 * platform-level action, replacing the frontend mock's {@code "platform"}
 * string sentinel with a real nullable FK (docs/BACKEND_CONTRACT.md).
 */
@Entity
@Table(name = "audit_log")
public class AuditLogEntry {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(name = "organization_id")
    private UUID organizationId;

    @Column(name = "actor_user_id")
    private UUID actorUserId;

    @Column(name = "actor_name", nullable = false)
    private String actorName;

    @Column(nullable = false)
    private String action;

    @Column(nullable = false)
    private String target;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    protected AuditLogEntry() {
        // JPA
    }

    public AuditLogEntry(UUID organizationId, UUID actorUserId, String actorName, String action, String target) {
        this.organizationId = organizationId;
        this.actorUserId = actorUserId;
        this.actorName = actorName;
        this.action = action;
        this.target = target;
        this.occurredAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public UUID getActorUserId() {
        return actorUserId;
    }

    public String getActorName() {
        return actorName;
    }

    public String getAction() {
        return action;
    }

    public String getTarget() {
        return target;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }
}
