package rw.ikiminaconnect.loan;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.util.UUID;

public record ApplyLoanRequest(
        @Positive BigDecimal amount,
        @NotBlank String purpose,
        @Min(1) int periodMonths,
        UUID guarantorId) {
}
