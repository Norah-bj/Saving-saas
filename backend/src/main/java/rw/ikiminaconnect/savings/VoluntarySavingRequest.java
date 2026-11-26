package rw.ikiminaconnect.savings;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record VoluntarySavingRequest(
        @NotNull @DecimalMin(value = "100", message = "The minimum deposit is 100 RWF.")
        @DecimalMax(value = "50000000", message = "The maximum single deposit is 50,000,000 RWF.")
        BigDecimal amountRwf,
        @NotBlank @Size(max = 60) String source) {
}
