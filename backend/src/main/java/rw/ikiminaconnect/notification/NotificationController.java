package rw.ikiminaconnect.notification;

import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import rw.ikiminaconnect.security.CurrentUser;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public List<NotificationDto> list(@AuthenticationPrincipal CurrentUser currentUser) {
        return notificationService.list(currentUser.userId());
    }

    @PostMapping("/{id}/read")
    public NotificationDto markRead(@AuthenticationPrincipal CurrentUser currentUser, @PathVariable UUID id) {
        return notificationService.markRead(currentUser.userId(), id);
    }

    @PostMapping("/read-all")
    public void markAllRead(@AuthenticationPrincipal CurrentUser currentUser) {
        notificationService.markAllRead(currentUser.userId());
    }
}
