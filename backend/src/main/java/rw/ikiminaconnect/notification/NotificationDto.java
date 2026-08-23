package rw.ikiminaconnect.notification;

import java.time.Instant;
import java.util.UUID;

public record NotificationDto(
        UUID id, String title, String body, NotificationType type, boolean read, Instant date) {

    public static NotificationDto from(AppNotification n) {
        return new NotificationDto(n.getId(), n.getTitle(), n.getBody(), n.getType(), n.isRead(), n.getCreatedAt());
    }
}
