package rw.ikiminaconnect.membership;

import jakarta.validation.constraints.NotNull;

public record DecisionRequest(@NotNull Decision decision) {
}
