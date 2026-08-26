package rw.ikiminaconnect.audit;

import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import rw.ikiminaconnect.security.CurrentUser;

@RestController
@RequestMapping("/api/v1/audit-logs")
@PreAuthorize("hasAnyRole('SUPER_ADMIN','ORG_ADMIN')")
public class AuditLogController {

    private final AuditLogQueryService auditLogQueryService;

    public AuditLogController(AuditLogQueryService auditLogQueryService) {
        this.auditLogQueryService = auditLogQueryService;
    }

    /**
     * SUPER_ADMIN may pass {@code organizationId} to narrow the platform-wide
     * trail (or omit it for everything, platform rows included). An
     * ORG_ADMIN is always forced to their own org regardless of what they
     * pass — {@code org-admin/Dashboard.tsx}'s "Recent Activity" card needs
     * this, and it must never be able to see another tenant's log.
     */
    @GetMapping
    public List<AuditLogDto> list(
            @AuthenticationPrincipal CurrentUser currentUser,
            @RequestParam(required = false) UUID organizationId) {
        UUID effectiveOrganizationId = currentUser.isSuperAdmin() ? organizationId : currentUser.organizationId();
        return auditLogQueryService.list(effectiveOrganizationId);
    }
}
