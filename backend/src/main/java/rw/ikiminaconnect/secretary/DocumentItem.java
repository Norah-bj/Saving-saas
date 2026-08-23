package rw.ikiminaconnect.secretary;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.UuidGenerator;

/**
 * Mirrors src/lib/types.ts's DocumentItem — metadata only, matching the
 * frontend mock exactly. There is no real file storage (S3/R2/MinIO) behind
 * this yet; see BACKEND_CONTRACT.md and docs/KNOWN_ISSUES.md.
 */
@Entity
@Table(name = "documents")
@Filter(name = "organizationFilter", condition = "organization_id = :orgId")
public class DocumentItem {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DocumentCategory category;

    @Enumerated(EnumType.STRING)
    @Column(name = "file_type", nullable = false)
    private DocumentFileType fileType;

    @Column(name = "uploaded_date", nullable = false)
    private LocalDate uploadedDate;

    @Column(name = "uploaded_by", nullable = false)
    private String uploadedBy;

    @Column(name = "size_kb", nullable = false)
    private Integer sizeKb;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DocumentVisibility visibility;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected DocumentItem() {
        // JPA
    }

    public DocumentItem(UUID organizationId, String name, DocumentCategory category,
                         DocumentFileType fileType, String uploadedBy, Integer sizeKb,
                         DocumentVisibility visibility) {
        this.organizationId = organizationId;
        this.name = name;
        this.category = category;
        this.fileType = fileType;
        this.uploadedDate = LocalDate.now();
        this.uploadedBy = uploadedBy;
        this.sizeKb = sizeKb;
        this.visibility = visibility;
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public String getName() {
        return name;
    }

    public DocumentCategory getCategory() {
        return category;
    }

    public DocumentFileType getFileType() {
        return fileType;
    }

    public LocalDate getUploadedDate() {
        return uploadedDate;
    }

    public String getUploadedBy() {
        return uploadedBy;
    }

    public Integer getSizeKb() {
        return sizeKb;
    }

    public DocumentVisibility getVisibility() {
        return visibility;
    }
}
