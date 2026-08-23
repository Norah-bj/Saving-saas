package rw.ikiminaconnect.membership;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record ShareWithdrawalRequestDto(
        UUID id, UUID memberId, Integer shares, BigDecimal amount, LocalDate requestedDate,
        RequestStatus status, String decidedBy, LocalDate decidedDate) {

    public static ShareWithdrawalRequestDto from(ShareWithdrawalRequest r) {
        return new ShareWithdrawalRequestDto(r.getId(), r.getMemberId(), r.getShares(), r.getAmount(),
                r.getRequestedDate(), r.getStatus(), r.getDecidedBy(), r.getDecidedDate());
    }
}
