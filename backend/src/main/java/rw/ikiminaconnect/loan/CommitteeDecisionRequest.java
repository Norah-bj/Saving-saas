package rw.ikiminaconnect.loan;

import jakarta.validation.constraints.NotNull;

public record CommitteeDecisionRequest(@NotNull Boolean approve, String notes) {
}
