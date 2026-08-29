package rw.ikiminaconnect.policy;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record PolicyDocumentDto(
        UUID id, String title, PolicyCategory category, String summary, List<String> body, LocalDate updatedAt) {

    public static PolicyDocumentDto from(PolicyDocument p) {
        return new PolicyDocumentDto(p.getId(), p.getTitle(), p.getCategory(), p.getSummary(), p.getBody(),
                p.getUpdatedAt());
    }
}
