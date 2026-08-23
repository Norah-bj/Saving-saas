package rw.ikiminaconnect.secretary;

import jakarta.validation.constraints.NotBlank;

public record RecordMinutesRequest(@NotBlank String minutesSummary) {
}
