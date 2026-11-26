package rw.ikiminaconnect.organization;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** An organization's uploaded logo image (see V12__organization_logos.sql). */
@Entity
@Table(name = "organization_logos")
public class OrganizationLogo {

    @Id
    @Column(name = "organization_id")
    private UUID organizationId;

    @Column(name = "content_type", nullable = false)
    private String contentType;

    @Column(name = "data", nullable = false)
    private byte[] data;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected OrganizationLogo() {
        // JPA
    }

    public OrganizationLogo(UUID organizationId, String contentType, byte[] data) {
        this.organizationId = organizationId;
        replace(contentType, data);
    }

    public void replace(String contentType, byte[] data) {
        this.contentType = contentType;
        this.data = data;
        this.updatedAt = Instant.now();
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public String getContentType() {
        return contentType;
    }

    public byte[] getData() {
        return data;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
