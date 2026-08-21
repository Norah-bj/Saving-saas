package rw.ikiminaconnect.loan;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record LoanCalculationRequest(@Positive BigDecimal amount, @Min(1) int periodMonths) {
}
