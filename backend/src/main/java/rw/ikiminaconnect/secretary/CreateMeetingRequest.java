package rw.ikiminaconnect.secretary;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;

public record CreateMeetingRequest(
        @NotBlank String title,
        @NotNull LocalDate date,
        @NotBlank String time,
        @NotBlank String location,
        @NotEmpty List<@NotBlank String> agenda) {
}
