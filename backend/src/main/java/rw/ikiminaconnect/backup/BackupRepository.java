package rw.ikiminaconnect.backup;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BackupRepository extends JpaRepository<BackupRecord, UUID> {

    List<BackupRecord> findAllByOrganizationIdOrderByCreatedAtDesc(UUID organizationId);

    List<BackupRecord> findAllByOrderByCreatedAtDesc();

    /**
     * Rough size proxy — total row count across a fixed set of core tenant
     * tables. When {@code orgId} is null (platform-wide backup), counts
     * across every organization instead of filtering to one.
     */
    @Query(value = """
            SELECT
                  (SELECT count(*) FROM users WHERE :orgId IS NULL OR organization_id = :orgId)
                + (SELECT count(*) FROM savings_transactions WHERE :orgId IS NULL OR organization_id = :orgId)
                + (SELECT count(*) FROM share_holdings WHERE :orgId IS NULL OR organization_id = :orgId)
                + (SELECT count(*) FROM loans WHERE :orgId IS NULL OR organization_id = :orgId)
                + (SELECT count(*) FROM guarantees WHERE :orgId IS NULL OR organization_id = :orgId)
                + (SELECT count(*) FROM ledger_transactions WHERE :orgId IS NULL OR organization_id = :orgId)
                + (SELECT count(*) FROM meetings WHERE :orgId IS NULL OR organization_id = :orgId)
                + (SELECT count(*) FROM announcements WHERE :orgId IS NULL OR organization_id = :orgId)
                + (SELECT count(*) FROM documents WHERE :orgId IS NULL OR organization_id = :orgId)
                + (SELECT count(*) FROM payroll_import_summaries WHERE :orgId IS NULL OR organization_id = :orgId)
                + (SELECT count(*) FROM audit_log WHERE :orgId IS NULL OR organization_id = :orgId)
            """, nativeQuery = true)
    long estimateRowCount(@Param("orgId") UUID orgId);
}
