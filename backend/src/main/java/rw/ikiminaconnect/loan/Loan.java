package rw.ikiminaconnect.loan;

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
 * Core lending entity. Mirrors src/lib/types.ts's Loan interface. The
 * {@code organizationFilter} is defined once, in
 * {@code rw.ikiminaconnect.tenant.package-info}.
 */
@Entity
@Table(name = "loans")
@Filter(name = "organizationFilter", condition = "organization_id = :orgId")
public class Loan {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "contract_number", nullable = false)
    private String contractNumber;

    @Column(name = "member_id", nullable = false)
    private UUID memberId;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private String purpose;

    @Column(name = "period_months", nullable = false)
    private int periodMonths;

    @Column(name = "interest_rate", nullable = false, precision = 5, scale = 4)
    private BigDecimal interestRate;

    @Column(name = "insurance_required", nullable = false)
    private boolean insuranceRequired;

    @Column(name = "insurance_fee", nullable = false, precision = 14, scale = 2)
    private BigDecimal insuranceFee;

    @Column(name = "monthly_installment", nullable = false, precision = 14, scale = 2)
    private BigDecimal monthlyInstallment;

    @Column(name = "total_payable", nullable = false, precision = 14, scale = 2)
    private BigDecimal totalPayable;

    @Column(name = "remaining_balance", nullable = false, precision = 14, scale = 2)
    private BigDecimal remainingBalance;

    // No @Enumerated here — LoanStatusConverter (autoApply=true) handles the
    // hyphenated string form. Combining both on the same field is a real
    // conflict that silently writes the wrong string ("SUBMITTED" instead of
    // "submitted") and fails the DB's CHECK constraint — same pattern as
    // member.Role and savings.SavingsTxType, which correctly use only the
    // converter, no @Enumerated.
    @Column(nullable = false)
    private LoanStatus status;

    @Column(name = "applied_date", nullable = false)
    private LocalDate appliedDate;

    @Column(name = "approved_date")
    private LocalDate approvedDate;

    @Column(name = "disbursed_date")
    private LocalDate disbursedDate;

    @Column(name = "risk_score", nullable = false)
    private int riskScore;

    @Column(name = "committee_notes")
    private String committeeNotes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Loan() {
        // JPA
    }

    public Loan(UUID organizationId, String contractNumber, UUID memberId, BigDecimal amount, String purpose,
                int periodMonths, BigDecimal interestRate, boolean insuranceRequired, BigDecimal insuranceFee,
                BigDecimal monthlyInstallment, BigDecimal totalPayable, int riskScore) {
        this.organizationId = organizationId;
        this.contractNumber = contractNumber;
        this.memberId = memberId;
        this.amount = amount;
        this.purpose = purpose;
        this.periodMonths = periodMonths;
        this.interestRate = interestRate;
        this.insuranceRequired = insuranceRequired;
        this.insuranceFee = insuranceFee;
        this.monthlyInstallment = monthlyInstallment;
        this.totalPayable = totalPayable;
        this.remainingBalance = totalPayable;
        this.status = LoanStatus.SUBMITTED;
        this.appliedDate = LocalDate.now();
        this.riskScore = riskScore;
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    public UUID getId() {
        return id;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public String getContractNumber() {
        return contractNumber;
    }

    public UUID getMemberId() {
        return memberId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getPurpose() {
        return purpose;
    }

    public int getPeriodMonths() {
        return periodMonths;
    }

    public BigDecimal getInterestRate() {
        return interestRate;
    }

    public boolean isInsuranceRequired() {
        return insuranceRequired;
    }

    public BigDecimal getInsuranceFee() {
        return insuranceFee;
    }

    public BigDecimal getMonthlyInstallment() {
        return monthlyInstallment;
    }

    public BigDecimal getTotalPayable() {
        return totalPayable;
    }

    public BigDecimal getRemainingBalance() {
        return remainingBalance;
    }

    public LoanStatus getStatus() {
        return status;
    }

    public LocalDate getAppliedDate() {
        return appliedDate;
    }

    public LocalDate getApprovedDate() {
        return approvedDate;
    }

    public LocalDate getDisbursedDate() {
        return disbursedDate;
    }

    public int getRiskScore() {
        return riskScore;
    }

    public String getCommitteeNotes() {
        return committeeNotes;
    }

    /** Guarantor accepted — forwarded to committee review (data-store.ts's respondGuarantee). */
    public void forwardToCommitteeReview() {
        this.status = LoanStatus.COMMITTEE_REVIEW;
        this.updatedAt = Instant.now();
    }

    /** Guarantor declined — the loan is rejected outright, same as the frontend mock. */
    public void rejectByGuarantorDecline() {
        this.status = LoanStatus.REJECTED;
        this.committeeNotes = "Guarantor declined the request.";
        this.updatedAt = Instant.now();
    }

    /** Self-covered loan under review moves straight to committee-review (no guarantor step). */
    public void moveToGuarantorApproval() {
        this.status = LoanStatus.GUARANTOR_APPROVAL;
        this.updatedAt = Instant.now();
    }

    public void approve(String committeeNotes) {
        this.status = LoanStatus.APPROVED;
        this.approvedDate = LocalDate.now();
        this.committeeNotes = committeeNotes;
        this.updatedAt = Instant.now();
    }

    public void rejectByCommittee(String committeeNotes) {
        this.status = LoanStatus.REJECTED;
        this.committeeNotes = committeeNotes;
        this.updatedAt = Instant.now();
    }

    public void markContractGenerated() {
        this.status = LoanStatus.CONTRACT_GENERATED;
        this.updatedAt = Instant.now();
    }
}
