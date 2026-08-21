package rw.ikiminaconnect.savings;

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
 * One append-only ledger row per member. Mirrors src/lib/types.ts's
 * SavingsTransaction. {@code balanceAfter} must only ever be set by
 * {@link SavingsService}, computed from the previous balance under a row
 * lock — never accept a client-supplied value. The {@code organizationFilter}
 * is defined once, in {@code rw.ikiminaconnect.tenant.package-info}.
 */
@Entity
@Table(name = "savings_transactions")
@Filter(name = "organizationFilter", condition = "organization_id = :orgId")
public class SavingsTransaction {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "member_id", nullable = false)
    private UUID memberId;

    @Column(name = "occurred_on", nullable = false)
    private LocalDate occurredOn;

    @Column(nullable = false)
    private SavingsTxType type;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(name = "balance_after", nullable = false, precision = 14, scale = 2)
    private BigDecimal balanceAfter;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private String source;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected SavingsTransaction() {
        // JPA
    }

    public SavingsTransaction(UUID organizationId, UUID memberId, SavingsTxType type, BigDecimal amount,
                               BigDecimal balanceAfter, String description, String source) {
        this.organizationId = organizationId;
        this.memberId = memberId;
        this.occurredOn = LocalDate.now();
        this.type = type;
        this.amount = amount;
        this.balanceAfter = balanceAfter;
        this.description = description;
        this.source = source;
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public UUID getMemberId() {
        return memberId;
    }

    public LocalDate getOccurredOn() {
        return occurredOn;
    }

    public SavingsTxType getType() {
        return type;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public BigDecimal getBalanceAfter() {
        return balanceAfter;
    }

    public String getDescription() {
        return description;
    }

    public String getSource() {
        return source;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
