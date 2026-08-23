package rw.ikiminaconnect.ledger;

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
 * Accountant-facing bookkeeping view (disbursements, repayments, fees,
 * interest income) — distinct from {@link rw.ikiminaconnect.savings.SavingsTransaction},
 * which is the member-facing savings ledger. Mirrors src/lib/types.ts's
 * LedgerTransaction. No {@code @Enumerated} on the type/method fields — the
 * autoApply converters (LedgerTxTypeConverter, LedgerTxMethodConverter)
 * handle them; combining both is the bug documented on loan.Loan.status.
 */
@Entity
@Table(name = "ledger_transactions")
@Filter(name = "organizationFilter", condition = "organization_id = :orgId")
public class LedgerTransaction {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "member_id", nullable = false)
    private UUID memberId;

    @Column(nullable = false)
    private LedgerTxType type;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(name = "occurred_on", nullable = false)
    private LocalDate occurredOn;

    @Column(nullable = false)
    private LedgerTxMethod method;

    @Column(nullable = false)
    private String reference;

    @Column(name = "recorded_by_user_id")
    private UUID recordedByUserId;

    @Column(name = "recorded_by_name", nullable = false)
    private String recordedByName;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected LedgerTransaction() {
        // JPA
    }

    public LedgerTransaction(UUID organizationId, UUID memberId, LedgerTxType type, BigDecimal amount,
                              LedgerTxMethod method, String reference, UUID recordedByUserId, String recordedByName) {
        this.organizationId = organizationId;
        this.memberId = memberId;
        this.type = type;
        this.amount = amount;
        this.occurredOn = LocalDate.now();
        this.method = method;
        this.reference = reference;
        this.recordedByUserId = recordedByUserId;
        this.recordedByName = recordedByName;
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getMemberId() {
        return memberId;
    }

    public LedgerTxType getType() {
        return type;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public LocalDate getOccurredOn() {
        return occurredOn;
    }

    public LedgerTxMethod getMethod() {
        return method;
    }

    public String getReference() {
        return reference;
    }

    public String getRecordedByName() {
        return recordedByName;
    }
}
