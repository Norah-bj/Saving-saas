package rw.ikiminaconnect.notification;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<AppNotification, UUID> {
    List<AppNotification> findAllByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<AppNotification> findByIdAndUserId(UUID id, UUID userId);
    List<AppNotification> findAllByUserIdAndReadFalse(UUID userId);
}
