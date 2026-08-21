package rw.ikiminaconnect.payroll;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.UuidGenerator;

/**
 * One row per uploaded payroll file. Mirrors src/lib/types.ts's
 * PayrollImportSummary. The {@code organizationFilter} is defined once, in
 * {@code rw.ikiminaconnect.tenant.package-info}.
 */
@Entity
@Table(name = "payroll_import_summaries")
@Filter(name = "organizationFilter", condition = "organization_id = :orgId")
public class PayrollImportSummary {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "imported_by_user_id")
    private UUID importedByUserId;

    @Column(name = "imported_by_name", nullable = false)
    private String importedByName;

    @Column(name = "occurred_on", nullable = false)
    private LocalDate occurredOn;

    @Column(name = "total_records", nullable = false)
    private int totalRecords;

    @Column(nullable = false)
    private int successful;

    @Column(nullable = false)
    private int failed;

    @Column(nullable = false)
    private int duplicates;

    @Column(name = "total_amount_rwf", nullable = false, precision = 14, scale = 2)
    private BigDecimal totalAmountRwf;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected PayrollImportSummary() {
        // JPA
    }

    public PayrollImportSummary(UUID organizationId, String fileName, UUID importedByUserId,
                                 String importedByName, int totalRecords, int successful, int failed,
                                 int duplicates, BigDecimal totalAmountRwf) {
        this.organizationId = organizationId;
        this.fileName = fileName;
        this.importedByUserId = importedByUserId;
        this.importedByName = importedByName;
        this.occurredOn = LocalDate.now();
        this.totalRecords = totalRecords;
        this.successful = successful;
        this.failed = failed;
        this.duplicates = duplicates;
        this.totalAmountRwf = totalAmountRwf;
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public String getFileName() {
        return fileName;
    }

    public String getImportedByName() {
        return importedByName;
    }

    public LocalDate getOccurredOn() {
        return occurredOn;
    }

    public int getTotalRecords() {
        return totalRecords;
    }

    public int getSuccessful() {
        return successful;
    }

    public int getFailed() {
        return failed;
    }

    public int getDuplicates() {
        return duplicates;
    }

    public BigDecimal getTotalAmountRwf() {
        return totalAmountRwf;
    }
}
