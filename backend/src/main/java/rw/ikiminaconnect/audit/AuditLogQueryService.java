package rw.ikiminaconnect.audit;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Platform (SUPER_ADMIN) read access to the full audit trail — every org, plus platform-level rows. */
@Service
public class AuditLogQueryService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogQueryService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional(readOnly = true)
    public List<AuditLogDto> list(UUID organizationId) {
        List<AuditLogEntry> entries = organizationId == null
                ? auditLogRepository.findAllByOrderByOccurredAtDesc()
                : auditLogRepository.findAllByOrganizationIdOrderByOccurredAtDesc(organizationId);
        return entries.stream().map(AuditLogDto::from).toList();
    }
}
