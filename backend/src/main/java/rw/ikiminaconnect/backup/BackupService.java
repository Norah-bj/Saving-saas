package rw.ikiminaconnect.backup;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rw.ikiminaconnect.audit.AuditService;

/**
 * Backup *records* only — there is no real pg_dump/restore automation
 * behind this (see BackupRecord's javadoc and docs/KNOWN_ISSUES.md).
 * {@code organizationId} being null means platform-wide, which happens
 * naturally for a super-admin caller since {@code CurrentUser.organizationId()}
 * is already null for them — no special-casing needed here.
 */
@Service
public class BackupService {

    private final BackupRepository backupRepository;
    private final AuditService auditService;

    public BackupService(BackupRepository backupRepository, AuditService auditService) {
        this.backupRepository = backupRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<BackupDto> list(UUID organizationId, boolean isSuperAdmin) {
        List<BackupRecord> records = isSuperAdmin
                ? backupRepository.findAllByOrderByCreatedAtDesc()
                : backupRepository.findAllByOrganizationIdOrderByCreatedAtDesc(organizationId);
        return records.stream().map(BackupDto::from).toList();
    }

    @Transactional
    public BackupDto create(UUID organizationId, CreateBackupRequest request, UUID actorId, String actorName) {
        int sizeMb = (int) Math.max(1, backupRepository.estimateRowCount(organizationId) / 50);
        BackupRecord record = new BackupRecord(organizationId, request.label(), BackupType.manual, sizeMb, actorName);
        record = backupRepository.save(record);
        auditService.record(organizationId, actorId, actorName, "Created backup", record.getLabel());
        return BackupDto.from(record);
    }
}
