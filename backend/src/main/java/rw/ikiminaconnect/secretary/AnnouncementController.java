package rw.ikiminaconnect.secretary;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import rw.ikiminaconnect.security.CurrentUser;

@RestController
@RequestMapping("/api/v1/announcements")
public class AnnouncementController {

    private final SecretaryOpsService secretaryOpsService;

    public AnnouncementController(SecretaryOpsService secretaryOpsService) {
        this.secretaryOpsService = secretaryOpsService;
    }

    @GetMapping
    public List<AnnouncementDto> list(@AuthenticationPrincipal CurrentUser currentUser) {
        return secretaryOpsService.listAnnouncements(currentUser.organizationId(), isStaff(currentUser));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('SECRETARY','ORG_ADMIN')")
    public AnnouncementDto create(
            @AuthenticationPrincipal CurrentUser currentUser, @Valid @RequestBody CreateAnnouncementRequest request) {
        return secretaryOpsService.createAnnouncement(
                currentUser.organizationId(), request, currentUser.userId(), currentUser.fullName());
    }

    private static boolean isStaff(CurrentUser currentUser) {
        return currentUser.roles().stream().anyMatch(role -> !role.equals("member"));
    }
}
