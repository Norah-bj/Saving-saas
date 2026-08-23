package rw.ikiminaconnect.notification;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rw.ikiminaconnect.common.NotFoundException;

/**
 * Read side of the notification inbox only — nothing creates a notification
 * yet anywhere in the system (see docs/KNOWN_ISSUES.md). No create method
 * exists here deliberately, not as an oversight.
 */
@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> list(UUID userId) {
        return notificationRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(NotificationDto::from)
                .toList();
    }

    @Transactional
    public NotificationDto markRead(UUID userId, UUID notificationId) {
        AppNotification notification = notificationRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new NotFoundException("Notification not found."));
        notification.markRead();
        return NotificationDto.from(notification);
    }

    @Transactional
    public void markAllRead(UUID userId) {
        notificationRepository.findAllByUserIdAndReadFalse(userId).forEach(AppNotification::markRead);
    }
}
