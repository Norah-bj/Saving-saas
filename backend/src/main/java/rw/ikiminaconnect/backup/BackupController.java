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
@PreAuthorize("hasAnyRole('ORG_ADMIN','SUPER_ADMIN')")
public class BackupController {

    private final BackupService backupService;

    public BackupController(BackupService backupService) {
        this.backupService = backupService;
    }

    @GetMapping
    public List<BackupDto> list(@AuthenticationPrincipal CurrentUser currentUser) {
        return backupService.list(currentUser.organizationId(), currentUser.isSuperAdmin());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BackupDto create(
            @AuthenticationPrincipal CurrentUser currentUser, @Valid @RequestBody CreateBackupRequest request) {
        return backupService.create(
                currentUser.organizationId(), request, currentUser.userId(), currentUser.fullName());
    }
}
