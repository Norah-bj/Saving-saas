package rw.ikiminaconnect.backup;

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
@RequestMapping("/api/v1/backups")
public class BackupController {

    private final BackupService backupService;

    public BackupController(BackupService backupService) {
        this.backupService = backupService;
    }

    /**
     * ORG_ADMIN and SUPER_ADMIN. An ORG_ADMIN sees the platform-wide backups
     * (their own data's real coverage), not an org-scoped list that would
     * always be empty now — see BackupService's javadoc.
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ORG_ADMIN','SUPER_ADMIN')")
    public List<BackupDto> list(@AuthenticationPrincipal CurrentUser currentUser) {
        return backupService.list(currentUser.organizationId(), currentUser.isSuperAdmin());
    }

    /**
     * SUPER_ADMIN only — a real pg_dump only ever makes sense platform-wide
     * (see docs/DECISIONS.md), and only a platform operator should be able
     * to trigger one or know it produced a file on the server's disk.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public BackupDto create(
            @AuthenticationPrincipal CurrentUser currentUser, @Valid @RequestBody CreateBackupRequest request) {
        return backupService.create(request, currentUser.userId(), currentUser.fullName());
    }
}
