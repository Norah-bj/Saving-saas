package rw.ikiminaconnect.savings;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.Filter;

/**
 * One row per member. Deliberately has no share-value column — share value
 * is organizations.share_value_rwf, one authoritative value per tenant (see
 * docs/BACKEND_CONTRACT.md). Value in RWF = totalShares * that org's rate.
 * The {@code organizationFilter} is defined once, in
 * {@code rw.ikiminaconnect.tenant.package-info}.
 */
@Entity
@Table(name = "share_holdings")
@Filter(name = "organizationFilter", condition = "organization_id = :orgId")
public class ShareHolding {

    @Id
    @Column(name = "member_id")
    private UUID memberId;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "total_shares", nullable = false)
    private int totalShares;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ShareHolding() {
        // JPA
    }

    public ShareHolding(UUID memberId, UUID organizationId) {
        this.memberId = memberId;
        this.organizationId = organizationId;
        this.totalShares = 0;
        this.updatedAt = Instant.now();
    }

    public void addShares(int shares) {
        if (shares <= 0) {
            throw new IllegalArgumentException("shares must be positive");
        }
        this.totalShares += shares;
        this.updatedAt = Instant.now();
    }

    public UUID getMemberId() {
        return memberId;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public int getTotalShares() {
        return totalShares;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
