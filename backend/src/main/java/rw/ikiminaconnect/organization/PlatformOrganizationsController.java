package rw.ikiminaconnect.organization;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import rw.ikiminaconnect.security.CurrentUser;

/**
 * Platform-wide organization management — every organization on the
 * platform, not just the caller's own. SUPER_ADMIN only. Separate from
 * {@link OrganizationController} (which is always self-scoped to the
 * caller's own org) since these endpoints have no `{id} == my org` check —
 * that's the entire point of a platform view.
 */
@RestController
@RequestMapping("/api/v1/organizations")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class PlatformOrganizationsController {

    private final OrganizationService organizationService;

    public PlatformOrganizationsController(OrganizationService organizationService) {
        this.organizationService = organizationService;
    }

    @GetMapping
    public List<OrganizationDto> list() {
        return organizationService.listAll();
    }

    @PostMapping("/{id}/status")
    public OrganizationDto updateStatus(
            @AuthenticationPrincipal CurrentUser currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateOrganizationStatusRequest request) {
        return organizationService.updateStatusAsPlatform(id, request, currentUser.userId(), currentUser.fullName());
    }

    @PostMapping("/{id}/plan")
    public OrganizationDto updatePlan(
            @AuthenticationPrincipal CurrentUser currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateOrganizationPlanRequest request) {
        return organizationService.updatePlanAsPlatform(id, request, currentUser.userId(), currentUser.fullName());
    }
}
