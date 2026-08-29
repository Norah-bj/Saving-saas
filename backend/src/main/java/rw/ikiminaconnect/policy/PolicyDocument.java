package rw.ikiminaconnect.policy;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.UuidGenerator;

/**
 * Read-only cooperative governance/constitution text — mirrors
 * src/lib/types.ts's RolePolicy. Seeded identically for every organization
 * (see V9__policy_documents.sql and AuthService.register()); no update
 * endpoint exists yet, matching the "reference text, not yet editable per
 * org" framing this had as mock data. See docs/KNOWN_ISSUES.md.
 */
@Entity
@Table(name = "policy_documents")
@Filter(name = "organizationFilter", condition = "organization_id = :orgId")
public class PolicyDocument {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PolicyCategory category;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String summary;

    @Column(nullable = false)
    private List<String> body;

    @Column(name = "updated_at", nullable = false)
    private LocalDate updatedAt;

    protected PolicyDocument() {
        // JPA
    }

    public PolicyDocument(UUID organizationId, PolicyCategory category, String title, String summary,
                           List<String> body, LocalDate updatedAt) {
        this.organizationId = organizationId;
        this.category = category;
        this.title = title;
        this.summary = summary;
        this.body = body;
        this.updatedAt = updatedAt;
    }

    public UUID getId() {
        return id;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public PolicyCategory getCategory() {
        return category;
    }

    public String getTitle() {
        return title;
    }

    public String getSummary() {
        return summary;
    }

    public List<String> getBody() {
        return body;
    }

    public LocalDate getUpdatedAt() {
        return updatedAt;
    }
}
