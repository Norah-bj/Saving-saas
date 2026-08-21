package rw.ikiminaconnect.audit;

import java.util.UUID;
import org.springframework.stereotype.Service;

/** Injected into other services — every mutating endpoint writes one row here. */
@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void record(UUID organizationId, UUID actorUserId, String actorName, String action, String target) {
        auditLogRepository.save(new AuditLogEntry(organizationId, actorUserId, actorName, action, target));
    }
}
