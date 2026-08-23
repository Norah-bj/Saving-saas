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

/** Mirrors src/lib/types.ts's Announcement. */
@Entity
@Table(name = "announcements")
@Filter(name = "organizationFilter", condition = "organization_id = :orgId")
public class Announcement {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String body;

    @Column(name = "announcement_date", nullable = false)
    private LocalDate announcementDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AnnouncementPriority priority;

    @Column(nullable = false)
    private String author;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AnnouncementAudience audience;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Announcement() {
        // JPA
    }

    public Announcement(UUID organizationId, String title, String body, AnnouncementPriority priority,
                         String author, AnnouncementAudience audience) {
        this.organizationId = organizationId;
        this.title = title;
        this.body = body;
        this.announcementDate = LocalDate.now();
        this.priority = priority;
        this.author = author;
        this.audience = audience;
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public String getTitle() {
        return title;
    }

    public String getBody() {
        return body;
    }

    public LocalDate getAnnouncementDate() {
        return announcementDate;
    }

    public AnnouncementPriority getPriority() {
        return priority;
    }

    public String getAuthor() {
        return author;
    }

    public AnnouncementAudience getAudience() {
        return audience;
    }
}
