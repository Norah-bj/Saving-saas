package rw.ikiminaconnect.notification;

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
 * Mirrors src/lib/types.ts's AppNotification. Scoped by {@code userId} alone
 * — a personal inbox, same pattern as {@code loan.Guarantee}'s "always my
 * requests" endpoint — so no {@code organizationId} column or tenant filter
 * is needed; a user only ever sees their own rows.
 */
@Entity
@Table(name = "notifications")
public class AppNotification {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String body;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;

    @Column(nullable = false)
    private boolean read = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected AppNotification() {
        // JPA
    }

    public AppNotification(UUID userId, String title, String body, NotificationType type) {
        this.userId = userId;
        this.title = title;
        this.body = body;
        this.type = type;
        this.createdAt = Instant.now();
    }

    public void markRead() {
        this.read = true;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getTitle() {
        return title;
    }

    public String getBody() {
        return body;
    }

    public NotificationType getType() {
        return type;
    }

    public boolean isRead() {
        return read;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
