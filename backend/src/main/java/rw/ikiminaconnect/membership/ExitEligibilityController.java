package rw.ikiminaconnect.membership;

import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import rw.ikiminaconnect.security.CurrentUser;

/**
 * Separate from {@link ExitRequestController} since this is queried by two
 * different callers for two different targets — a member checking their own
 * eligibility (Profile.tsx) and staff checking a specific member's
 * eligibility while deciding a pending request (secretary/ExitRequests.tsx)
 * — matching {@code savings.SavingsController}'s self-or-staff shape.
 */
@RestController
@RequestMapping("/api/v1/members/{memberId}/exit-eligibility")
public class ExitEligibilityController {

    private static final String SELF_OR_STAFF =
            "#memberId == authentication.principal.userId() or hasAnyRole('SECRETARY','ORG_ADMIN')";

    private final ExitRequestService exitRequestService;

    public ExitEligibilityController(ExitRequestService exitRequestService) {
        this.exitRequestService = exitRequestService;
    }

    @GetMapping
    @PreAuthorize(SELF_OR_STAFF)
    public ExitEligibilityDto get(@AuthenticationPrincipal CurrentUser currentUser, @PathVariable UUID memberId) {
        return exitRequestService.eligibility(currentUser.organizationId(), memberId);
    }
}
