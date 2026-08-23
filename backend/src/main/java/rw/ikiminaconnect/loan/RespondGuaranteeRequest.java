package rw.ikiminaconnect.loan;

import jakarta.validation.constraints.NotNull;

public record RespondGuaranteeRequest(@NotNull Boolean accept) {
}
