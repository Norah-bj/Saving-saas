package rw.ikiminaconnect.notification;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rw.ikiminaconnect.common.NotFoundException;

/**
 * The inbox read side, plus the creation methods every triggering event
 * calls into: LoanApplicationService (submitted, guarantor requested),
 * GuaranteeService (guarantor responded), LoanReviewService (approved/
 * rejected), LoanDisbursementService (disbursed, repayment recorded, fully
 * repaid), SecretaryOpsService (meeting scheduled, announcement published).
 * See docs/KNOWN_ISSUES.md for what's deliberately NOT wired (savings/share
 * events, exit/share-withdrawal decisions) and why.
 */
@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional
    public void notify(UUID userId, NotificationType type, String title, String body) {
        notificationRepository.save(new AppNotification(userId, title, body, type));
    }

    @Transactional
    public void notifyMany(Collection<UUID> userIds, NotificationType type, String title, String body) {
        userIds.forEach(userId -> notificationRepository.save(new AppNotification(userId, title, body, type)));
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
