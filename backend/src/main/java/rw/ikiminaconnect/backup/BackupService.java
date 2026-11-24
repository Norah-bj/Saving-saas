package rw.ikiminaconnect.backup;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rw.ikiminaconnect.audit.AuditService;

/**
 * Since gap-closure phase 6, {@link #create} runs a real {@code pg_dump}
 * via {@link BackupFileService} — platform-wide only, SUPER_ADMIN-only (see
 * {@code BackupController}), no per-tenant restore. See docs/DECISIONS.md.
 *
 * <p>{@code list} for a non-super-admin now returns the platform-wide
 * backups (the only kind that get created for real) rather than an
 * org-scoped list that would always be empty — an org-admin's own data is
 * covered by those same platform-wide dumps.
 */
@Service
public class BackupService {

    private static final long BYTES_PER_MB = 1024L * 1024L;

    private final BackupRepository backupRepository;
    private final BackupFileService backupFileService;
    private final AuditService auditService;

    public BackupService(
            BackupRepository backupRepository, BackupFileService backupFileService, AuditService auditService) {
        this.backupRepository = backupRepository;
        this.backupFileService = backupFileService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<BackupDto> list(UUID organizationId, boolean isSuperAdmin) {
        List<BackupRecord> records = isSuperAdmin
                ? backupRepository.findAllByOrderByCreatedAtDesc()
                : backupRepository.findAllByOrganizationIdOrderByCreatedAtDesc(null);
        return records.stream().map(BackupDto::from).toList();
    }

    /** SUPER_ADMIN only (enforced by BackupController) — always platform-wide, never one org. */
    @Transactional
    public BackupDto create(CreateBackupRequest request, UUID actorId, String actorName) {
        BackupFileService.DumpResult result = backupFileService.dump(request.label());
        int sizeMb = (int) Math.max(1, result.sizeBytes() / BYTES_PER_MB);
        BackupRecord record = new BackupRecord(
                null, request.label(), BackupType.manual, sizeMb, actorName, result.filePath().toString());
        record = backupRepository.save(record);
        auditService.record(null, actorId, actorName, "Created platform backup", record.getLabel());
        return BackupDto.from(record);
    }
}
