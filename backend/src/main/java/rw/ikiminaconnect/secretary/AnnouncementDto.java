package rw.ikiminaconnect.secretary;

import java.time.LocalDate;
import java.util.UUID;

public record AnnouncementDto(
        UUID id, String title, String body, LocalDate date, AnnouncementPriority priority,
        String author, AnnouncementAudience audience) {

    public static AnnouncementDto from(Announcement a) {
        return new AnnouncementDto(a.getId(), a.getTitle(), a.getBody(), a.getAnnouncementDate(),
                a.getPriority(), a.getAuthor(), a.getAudience());
    }
}
