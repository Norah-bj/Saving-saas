package rw.ikiminaconnect.savings;

import java.math.BigDecimal;
import java.util.UUID;

public record BuySharesResponse(
        UUID memberId,
        int totalShares,
        BigDecimal shareValueRwf,
        BigDecimal totalValueRwf,
        SavingsTransactionDto ledgerEntry) {
}
