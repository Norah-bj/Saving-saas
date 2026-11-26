package rw.ikiminaconnect.savings;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Positive;

public record BuySharesRequest(@Positive @Max(value = 10000, message = "You can buy at most 10,000 shares at once.") int shares) {
}
