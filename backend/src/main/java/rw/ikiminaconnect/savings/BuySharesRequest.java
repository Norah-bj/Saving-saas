package rw.ikiminaconnect.savings;

import jakarta.validation.constraints.Positive;

public record BuySharesRequest(@Positive int shares) {
}
