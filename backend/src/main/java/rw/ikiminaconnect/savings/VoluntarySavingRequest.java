package rw.ikiminaconnect.savings;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record VoluntarySavingRequest(@Positive BigDecimal amountRwf, @NotBlank String source) {
}
