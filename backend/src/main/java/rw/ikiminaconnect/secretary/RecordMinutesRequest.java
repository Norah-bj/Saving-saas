package rw.ikiminaconnect.secretary;

import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotBlank;

public record RecordMinutesRequest(@NotBlank @Size(max = 5000) String minutesSummary) {
}
