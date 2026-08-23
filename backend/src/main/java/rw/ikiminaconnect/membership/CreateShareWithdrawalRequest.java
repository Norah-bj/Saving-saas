package rw.ikiminaconnect.membership;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record CreateShareWithdrawalRequest(@NotNull @Min(1) Integer shares) {
}
