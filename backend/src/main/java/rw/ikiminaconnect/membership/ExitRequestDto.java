package rw.ikiminaconnect.membership;

import java.time.LocalDate;
import java.util.UUID;

public record ExitRequestDto(
        UUID id, UUID memberId, String reason, LocalDate requestedDate, RequestStatus status,
        String decidedBy, LocalDate decidedDate) {

    public static ExitRequestDto from(ExitRequest r) {
        return new ExitRequestDto(r.getId(), r.getMemberId(), r.getReason(), r.getRequestedDate(),
                r.getStatus(), r.getDecidedBy(), r.getDecidedDate());
    }
}
