package rw.ikiminaconnect.secretary;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

/**
 * Mirrors src/lib/types.ts's Meeting. {@code status} has no hyphenated values
 * (unlike Role/LoanStatus/SavingsTxType), so it uses the same plain
 * lowercase-constant + {@code @Enumerated(STRING)} pattern as
 * {@code member.MemberStatus} — no converter needed.
 */
@Entity
@Table(name = "meetings")
@Filter(name = "organizationFilter", condition = "organization_id = :orgId")
public class Meeting {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(nullable = false)
    private String title;

    @Column(name = "meeting_date", nullable = false)
    private LocalDate meetingDate;

    @Column(name = "meeting_time", nullable = false)
    private String meetingTime;

    @Column(nullable = false)
    private String location;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(nullable = false)
    private List<String> agenda;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MeetingStatus status = MeetingStatus.upcoming;

    @Column(name = "minutes_summary")
    private String minutesSummary;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "attendee_ids", nullable = false)
    private List<UUID> attendeeIds = List.of();

    @Column(name = "created_by", nullable = false)
    private String createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Meeting() {
        // JPA
    }

    public Meeting(UUID organizationId, String title, LocalDate meetingDate, String meetingTime,
                    String location, List<String> agenda, String createdBy) {
        this.organizationId = organizationId;
        this.title = title;
        this.meetingDate = meetingDate;
        this.meetingTime = meetingTime;
        this.location = location;
        this.agenda = agenda;
        this.createdBy = createdBy;
        this.createdAt = Instant.now();
    }

    public void recordMinutes(String minutesSummary) {
        this.minutesSummary = minutesSummary;
        this.status = MeetingStatus.completed;
    }

    public UUID getId() {
        return id;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public String getTitle() {
        return title;
    }

    public LocalDate getMeetingDate() {
        return meetingDate;
    }

    public String getMeetingTime() {
        return meetingTime;
    }

    public String getLocation() {
        return location;
    }

    public List<String> getAgenda() {
        return agenda;
    }

    public MeetingStatus getStatus() {
        return status;
    }

    public String getMinutesSummary() {
        return minutesSummary;
    }

    public List<UUID> getAttendeeIds() {
        return attendeeIds;
    }

    public String getCreatedBy() {
        return createdBy;
    }
}
