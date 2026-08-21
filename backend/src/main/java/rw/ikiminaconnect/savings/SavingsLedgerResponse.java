package rw.ikiminaconnect.savings;

import java.math.BigDecimal;
import java.util.List;
import org.springframework.data.domain.Page;

public record SavingsLedgerResponse(
        List<SavingsTransactionDto> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        BigDecimal currentBalanceRwf) {

    public static SavingsLedgerResponse from(Page<SavingsTransaction> page, BigDecimal currentBalance) {
        return new SavingsLedgerResponse(
                page.getContent().stream().map(SavingsTransactionDto::from).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                currentBalance);
    }
}
