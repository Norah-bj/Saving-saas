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
@RequestMapping("/api/v1/share-withdrawals")
public class ShareWithdrawalRequestController {

    private final ShareWithdrawalRequestService shareWithdrawalRequestService;

    public ShareWithdrawalRequestController(ShareWithdrawalRequestService shareWithdrawalRequestService) {
        this.shareWithdrawalRequestService = shareWithdrawalRequestService;
    }

    @GetMapping
    public List<ShareWithdrawalRequestDto> list(@AuthenticationPrincipal CurrentUser currentUser) {
        return shareWithdrawalRequestService.list(
                currentUser.organizationId(), currentUser.userId(), isStaff(currentUser));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ShareWithdrawalRequestDto submit(
            @AuthenticationPrincipal CurrentUser currentUser, @Valid @RequestBody CreateShareWithdrawalRequest request) {
        return shareWithdrawalRequestService.submit(
                currentUser.organizationId(), currentUser.userId(), request, currentUser.fullName());
    }

    @PostMapping("/{id}/decision")
    @PreAuthorize("hasAnyRole('SECRETARY','ORG_ADMIN')")
    public ShareWithdrawalRequestDto decide(
            @AuthenticationPrincipal CurrentUser currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody DecisionRequest request) {
        return shareWithdrawalRequestService.decide(
                currentUser.organizationId(), id, request, currentUser.userId(), currentUser.fullName());
    }

    private static boolean isStaff(CurrentUser currentUser) {
        return currentUser.roles().stream().anyMatch(role -> !role.equals("member"));
    }
}
