package rw.ikiminaconnect.savings;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record SavingsTransactionDto(
        UUID id,
        LocalDate occurredOn,
        SavingsTxType type,
        BigDecimal amount,
        BigDecimal balanceAfter,
        String description,
        String source) {

    public static SavingsTransactionDto from(SavingsTransaction tx) {
        return new SavingsTransactionDto(
                tx.getId(), tx.getOccurredOn(), tx.getType(), tx.getAmount(),
                tx.getBalanceAfter(), tx.getDescription(), tx.getSource());
    }
}
