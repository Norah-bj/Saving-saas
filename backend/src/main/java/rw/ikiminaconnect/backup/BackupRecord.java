package rw.ikiminaconnect.backup;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.UuidGenerator;

/**
 * Mirrors src/lib/types.ts's BackupRecord. {@code organizationId} is
 * nullable — null means a platform-wide backup, replacing the frontend
 * mock's {@code "platform"} string sentinel with a real nullable FK, same
 * pattern as {@code audit.AuditLogEntry}. No {@code @Filter} for the same
 * reason: a filter scoped to one org's id would incorrectly hide the
 * platform-wide (null) rows a super-admin needs to see.
 *
 * <p>{@code sizeMb} is a real but rough proxy — total row count across a
 * fixed set of core tenant tables, not an actual file size — because there
 * is no real backup mechanism behind this yet (no pg_dump, no restore). See
 * docs/KNOWN_ISSUES.md. Deliberately not fabricated as a random number the
 * way the frontend mock does.
 */
@Entity
@Table(name = "backup_records")
public class BackupRecord {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(name = "organization_id")
    private UUID organizationId;

    @Column(nullable = false)
    private String label;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BackupType type;

    @Column(name = "size_mb", nullable = false)
    private Integer sizeMb;

    @Column(name = "created_by", nullable = false)
    private String createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected BackupRecord() {
        // JPA
    }

    public BackupRecord(UUID organizationId, String label, BackupType type, Integer sizeMb, String createdBy) {
        this.organizationId = organizationId;
        this.label = label;
        this.type = type;
        this.sizeMb = sizeMb;
        this.createdBy = createdBy;
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public String getLabel() {
        return label;
    }

    public BackupType getType() {
        return type;
    }

    public Integer getSizeMb() {
        return sizeMb;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
