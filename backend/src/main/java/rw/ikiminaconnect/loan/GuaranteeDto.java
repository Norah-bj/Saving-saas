package rw.ikiminaconnect.loan;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record GuaranteeDto(
        UUID id,
        UUID loanId,
        String loanContractNumber,
        BigDecimal loanRemainingBalance,
        UUID borrowerId,
        String borrowerName,
        BigDecimal amountGuaranteed,
        GuaranteeStatus status,
        LocalDate requestedDate,
        LocalDate respondedDate) {
}
