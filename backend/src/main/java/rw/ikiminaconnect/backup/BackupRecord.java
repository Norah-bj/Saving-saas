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
 * <p>Since gap-closure phase 6, every new row is backed by a real
 * {@code pg_dump} file (see {@link BackupFileService}) — {@code sizeMb} is
 * that file's real size and {@code filePath} points to it on disk (not
 * exposed via the API; ops-reference only, see docs/DEVELOPMENT.md for how
 * to actually restore one). Historical rows created before this phase have
 * {@code filePath == null} and an approximate {@code sizeMb} (a row-count
 * proxy) — they were never backed by a real file to begin with.
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

    @Column(name = "file_path")
    private String filePath;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected BackupRecord() {
        // JPA
    }

    public BackupRecord(UUID organizationId, String label, BackupType type, Integer sizeMb, String createdBy) {
        this(organizationId, label, type, sizeMb, createdBy, null);
    }

    public BackupRecord(
            UUID organizationId, String label, BackupType type, Integer sizeMb, String createdBy, String filePath) {
        this.organizationId = organizationId;
        this.label = label;
        this.type = type;
        this.sizeMb = sizeMb;
        this.createdBy = createdBy;
        this.filePath = filePath;
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

    public String getFilePath() {
        return filePath;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
