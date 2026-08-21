package rw.ikiminaconnect.payroll;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PayrollImportRecordRepository extends JpaRepository<PayrollImportRecord, UUID> {
    List<PayrollImportRecord> findAllByImportSummaryId(UUID importSummaryId);
}
