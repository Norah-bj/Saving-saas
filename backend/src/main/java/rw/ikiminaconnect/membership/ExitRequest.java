package rw.ikiminaconnect.membership;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.UuidGenerator;

/** Mirrors src/lib/types.ts's ExitRequest. */
@Entity
@Table(name = "exit_requests")
@Filter(name = "organizationFilter", condition = "organization_id = :orgId")
public class ExitRequest {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "member_id", nullable = false)
    private UUID memberId;

    @Column(nullable = false)
    private String reason;

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

    protected ExitRequest() {
        // JPA
    }

    public ExitRequest(UUID organizationId, UUID memberId, String reason) {
        this.organizationId = organizationId;
        this.memberId = memberId;
        this.reason = reason;
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

    public String getReason() {
        return reason;
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
