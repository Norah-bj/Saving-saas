package rw.ikiminaconnect.organization;

import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import rw.ikiminaconnect.security.CurrentUser;

/**
 * {@code #id == authentication.principal.organizationId()} on every method —
 * an org can only ever read/update its own record, never another tenant's.
 * Profile (branding/contact) fields are ORG_ADMIN-only; loan-policy fields
 * are also reachable by LOAN_COMMITTEE (loan-committee/Policy.tsx), matching
 * which frontend workspace edits which field group — see docs/API.md.
 */
@RestController
@RequestMapping("/api/v1/organizations/{id}")
public class OrganizationController {

    private final OrganizationService organizationService;

    public OrganizationController(OrganizationService organizationService) {
        this.organizationService = organizationService;
    }

    @GetMapping
    @PreAuthorize("#id == authentication.principal.organizationId()")
    public OrganizationDto get(@PathVariable UUID id) {
        return organizationService.get(id);
    }

    @PatchMapping("/profile")
    @PreAuthorize("#id == authentication.principal.organizationId() and hasRole('ORG_ADMIN')")
    public OrganizationDto updateProfile(
            @AuthenticationPrincipal CurrentUser currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateOrganizationProfileRequest request) {
        return organizationService.updateProfile(id, request, currentUser.userId(), currentUser.fullName());
    }

    @PatchMapping("/loan-policy")
    @PreAuthorize("#id == authentication.principal.organizationId() and hasAnyRole('ORG_ADMIN','LOAN_COMMITTEE')")
    public OrganizationDto updateLoanPolicy(
            @AuthenticationPrincipal CurrentUser currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateOrganizationLoanPolicyRequest request) {
        return organizationService.updateLoanPolicy(id, request, currentUser.userId(), currentUser.fullName());
    }
}
