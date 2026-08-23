package rw.ikiminaconnect.secretary;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record MeetingDto(
        UUID id, String title, LocalDate date, String time, String location, List<String> agenda,
        MeetingStatus status, String minutesSummary, List<UUID> attendeeIds, String createdBy) {

    public static MeetingDto from(Meeting m) {
        return new MeetingDto(m.getId(), m.getTitle(), m.getMeetingDate(), m.getMeetingTime(),
                m.getLocation(), m.getAgenda(), m.getStatus(), m.getMinutesSummary(),
                m.getAttendeeIds(), m.getCreatedBy());
    }
}
