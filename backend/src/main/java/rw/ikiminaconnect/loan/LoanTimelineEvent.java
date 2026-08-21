package rw.ikiminaconnect.loan;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.hibernate.annotations.UuidGenerator;

/**
 * Child table of {@link Loan} rather than a JSON column, per
 * BACKEND_CONTRACT.md — no direct organization_id (and so no tenant
 * @Filter); always accessed through its parent loan, which is org-scoped.
 */
@Entity
@Table(name = "loan_timeline_events")
public class LoanTimelineEvent {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(name = "loan_id", nullable = false)
    private UUID loanId;

    // No @Enumerated — see Loan.status's comment; LoanStatusConverter
    // (autoApply=true) handles this field too.
    @Column(nullable = false)
    private LoanStatus stage;

    @Column(name = "occurred_on", nullable = false)
    private LocalDate occurredOn;

    @Column(nullable = false)
    private String officer;

    @Column
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected LoanTimelineEvent() {
        // JPA
    }

    public LoanTimelineEvent(UUID loanId, LoanStatus stage, String officer, String notes) {
        this.loanId = loanId;
        this.stage = stage;
        this.occurredOn = LocalDate.now();
        this.officer = officer;
        this.notes = notes;
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public LoanStatus getStage() {
        return stage;
    }

    public LocalDate getOccurredOn() {
        return occurredOn;
    }

    public String getOfficer() {
        return officer;
    }

    public String getNotes() {
        return notes;
    }
}
