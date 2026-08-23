package rw.ikiminaconnect.membership;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import rw.ikiminaconnect.security.CurrentUser;

@RestController
@RequestMapping("/api/v1/exit-requests")
public class ExitRequestController {

    private final ExitRequestService exitRequestService;

    public ExitRequestController(ExitRequestService exitRequestService) {
        this.exitRequestService = exitRequestService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SECRETARY','ORG_ADMIN')")
    public List<ExitRequestDto> list(@AuthenticationPrincipal CurrentUser currentUser) {
        return exitRequestService.list(currentUser.organizationId());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ExitRequestDto submit(
            @AuthenticationPrincipal CurrentUser currentUser, @Valid @RequestBody CreateExitRequest request) {
        return exitRequestService.submit(
                currentUser.organizationId(), currentUser.userId(), request, currentUser.fullName());
    }

    @PostMapping("/{id}/decision")
    @PreAuthorize("hasAnyRole('SECRETARY','ORG_ADMIN')")
    public ExitRequestDto decide(
            @AuthenticationPrincipal CurrentUser currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody DecisionRequest request) {
        return exitRequestService.decide(
                currentUser.organizationId(), id, request, currentUser.userId(), currentUser.fullName());
    }
}
