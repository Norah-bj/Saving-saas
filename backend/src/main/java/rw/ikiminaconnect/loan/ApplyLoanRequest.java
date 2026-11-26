package rw.ikiminaconnect.loan;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.util.UUID;

public record ApplyLoanRequest(
        @Positive @DecimalMax(value = "100000000", message = "That amount looks too high — check it.") BigDecimal amount,
        @NotBlank @Size(max = 300) String purpose,
        @Min(1) int periodMonths,
        UUID guarantorId) {
}
