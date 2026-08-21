package rw.ikiminaconnect.loan;

import java.time.LocalDate;

public record LoanTimelineEventDto(LoanStatus stage, LocalDate occurredOn, String officer, String notes) {

    public static LoanTimelineEventDto from(LoanTimelineEvent event) {
        return new LoanTimelineEventDto(event.getStage(), event.getOccurredOn(), event.getOfficer(), event.getNotes());
    }
}
