package rw.ikiminaconnect.loan;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.UuidGenerator;

/**
 * Links a {@link Loan} to a guarantor user. Created here (phase 5, as part
 * of loan application) but the response workflow (accept/reject) and the
 * guarantor-lock business rule are phase 6 — see V3__loans.sql's header
 * comment.
 */
@Entity
@Table(name = "guarantees")
@Filter(name = "organizationFilter", condition = "organization_id = :orgId")
public class Guarantee {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "loan_id", nullable = false)
    private UUID loanId;

    @Column(name = "borrower_id", nullable = false)
    private UUID borrowerId;

    @Column(name = "guarantor_id", nullable = false)
    private UUID guarantorId;

    @Column(name = "amount_guaranteed", nullable = false, precision = 14, scale = 2)
    private BigDecimal amountGuaranteed;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private GuaranteeStatus status = GuaranteeStatus.pending;

    @Column(name = "requested_date", nullable = false)
    private LocalDate requestedDate;

    @Column(name = "responded_date")
    private LocalDate respondedDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Guarantee() {
        // JPA
    }

    public Guarantee(UUID organizationId, UUID loanId, UUID borrowerId, UUID guarantorId,
                      BigDecimal amountGuaranteed) {
        this.organizationId = organizationId;
        this.loanId = loanId;
        this.borrowerId = borrowerId;
        this.guarantorId = guarantorId;
        this.amountGuaranteed = amountGuaranteed;
        this.requestedDate = LocalDate.now();
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getLoanId() {
        return loanId;
    }

    public UUID getBorrowerId() {
        return borrowerId;
    }

    public UUID getGuarantorId() {
        return guarantorId;
    }

    public BigDecimal getAmountGuaranteed() {
        return amountGuaranteed;
    }

    public GuaranteeStatus getStatus() {
        return status;
    }

    public LocalDate getRequestedDate() {
        return requestedDate;
    }

    public LocalDate getRespondedDate() {
        return respondedDate;
    }

    public void accept() {
        this.status = GuaranteeStatus.accepted;
        this.respondedDate = LocalDate.now();
    }

    public void reject() {
        this.status = GuaranteeStatus.rejected;
        this.respondedDate = LocalDate.now();
    }
}
