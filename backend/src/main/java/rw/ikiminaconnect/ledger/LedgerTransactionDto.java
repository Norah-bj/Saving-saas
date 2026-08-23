package rw.ikiminaconnect.ledger;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record LedgerTransactionDto(
        UUID id,
        UUID memberId,
        LedgerTxType type,
        LedgerTxMethod method,
        BigDecimal amount,
        LocalDate occurredOn,
        String reference,
        String recordedBy) {

    public static LedgerTransactionDto from(LedgerTransaction t) {
        return new LedgerTransactionDto(
                t.getId(), t.getMemberId(), t.getType(), t.getMethod(), t.getAmount(),
                t.getOccurredOn(), t.getReference(), t.getRecordedByName());
    }
}
