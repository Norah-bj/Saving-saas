package rw.ikiminaconnect.secretary;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import rw.ikiminaconnect.security.CurrentUser;

@RestController
@RequestMapping("/api/v1/meetings")
public class MeetingController {

    private final SecretaryOpsService secretaryOpsService;

    public MeetingController(SecretaryOpsService secretaryOpsService) {
        this.secretaryOpsService = secretaryOpsService;
    }

    @GetMapping
    public List<MeetingDto> list(@AuthenticationPrincipal CurrentUser currentUser) {
        return secretaryOpsService.listMeetings(currentUser.organizationId());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('SECRETARY','ORG_ADMIN')")
    public MeetingDto create(
            @AuthenticationPrincipal CurrentUser currentUser, @Valid @RequestBody CreateMeetingRequest request) {
        return secretaryOpsService.createMeeting(
                currentUser.organizationId(), request, currentUser.userId(), currentUser.fullName());
    }

    @PostMapping("/{id}/minutes")
    @PreAuthorize("hasAnyRole('SECRETARY','ORG_ADMIN')")
    public MeetingDto recordMinutes(
            @AuthenticationPrincipal CurrentUser currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody RecordMinutesRequest request) {
        return secretaryOpsService.recordMinutes(
                currentUser.organizationId(), id, request, currentUser.userId(), currentUser.fullName());
    }
}
