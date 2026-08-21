package rw.ikiminaconnect.payroll;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;
import org.hibernate.annotations.UuidGenerator;

/**
 * Per-row validation detail of one payroll import. No direct organization_id
 * (and so no tenant @Filter) — always accessed through its parent
 * {@link PayrollImportSummary}, which is itself org-scoped.
 */
@Entity
@Table(name = "payroll_import_records")
public class PayrollImportRecord {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(name = "import_summary_id", nullable = false)
    private UUID importSummaryId;

    @Column(name = "employee_id", nullable = false)
    private String employeeId;

    @Column(name = "national_id", nullable = false)
    private String nationalId;

    @Column(name = "member_name", nullable = false)
    private String memberName;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PayrollImportStatus status;

    @Column(name = "error_reason")
    private String errorReason;

    protected PayrollImportRecord() {
        // JPA
    }

    public PayrollImportRecord(UUID importSummaryId, String employeeId, String nationalId, String memberName,
                                BigDecimal amount, PayrollImportStatus status, String errorReason) {
        this.importSummaryId = importSummaryId;
        this.employeeId = employeeId;
        this.nationalId = nationalId;
        this.memberName = memberName;
        this.amount = amount;
        this.status = status;
        this.errorReason = errorReason;
    }

    public UUID getId() {
        return id;
    }

    public String getEmployeeId() {
        return employeeId;
    }

    public String getNationalId() {
        return nationalId;
    }

    public String getMemberName() {
        return memberName;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public PayrollImportStatus getStatus() {
        return status;
    }

    public String getErrorReason() {
        return errorReason;
    }
}
