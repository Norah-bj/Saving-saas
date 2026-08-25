package rw.ikiminaconnect.membership;

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

/** Mirrors src/lib/types.ts's ShareWithdrawalRequest. */
@Entity
@Table(name = "share_withdrawal_requests")
@Filter(name = "organizationFilter", condition = "organization_id = :orgId")
public class ShareWithdrawalRequest {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "member_id", nullable = false)
    private UUID memberId;

    @Column(nullable = false)
    private Integer shares;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(name = "requested_date", nullable = false)
    private LocalDate requestedDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RequestStatus status = RequestStatus.pending;

    @Column(name = "decided_by")
    private String decidedBy;

    @Column(name = "decided_date")
    private LocalDate decidedDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ShareWithdrawalRequest() {
        // JPA
    }

    public ShareWithdrawalRequest(UUID organizationId, UUID memberId, Integer shares, BigDecimal amount) {
        this.organizationId = organizationId;
        this.memberId = memberId;
        this.shares = shares;
        this.amount = amount;
        this.requestedDate = LocalDate.now();
        this.createdAt = Instant.now();
    }

    public void decide(Decision decision, String decidedBy) {
        this.status = decision == Decision.approve ? RequestStatus.approved : RequestStatus.rejected;
        this.decidedBy = decidedBy;
        this.decidedDate = LocalDate.now();
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

    public Integer getShares() {
        return shares;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public LocalDate getRequestedDate() {
        return requestedDate;
    }

    public RequestStatus getStatus() {
        return status;
    }

    public String getDecidedBy() {
        return decidedBy;
    }

    public LocalDate getDecidedDate() {
        return decidedDate;
    }
}
