package rw.ikiminaconnect.payroll;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PayrollImportSummaryRepository extends JpaRepository<PayrollImportSummary, UUID> {
    Page<PayrollImportSummary> findAllByOrganizationIdOrderByCreatedAtDesc(UUID organizationId, Pageable pageable);

    Optional<PayrollImportSummary> findByIdAndOrganizationId(UUID id, UUID organizationId);
}
