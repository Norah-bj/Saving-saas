package rw.ikiminaconnect.secretary;

import java.time.LocalDate;
import java.util.UUID;

public record DocumentDto(
        UUID id, String name, DocumentCategory category, DocumentFileType fileType,
        LocalDate uploadedDate, String uploadedBy, Integer sizeKb, DocumentVisibility visibility) {

    public static DocumentDto from(DocumentItem d) {
        return new DocumentDto(d.getId(), d.getName(), d.getCategory(), d.getFileType(),
                d.getUploadedDate(), d.getUploadedBy(), d.getSizeKb(), d.getVisibility());
    }
}
