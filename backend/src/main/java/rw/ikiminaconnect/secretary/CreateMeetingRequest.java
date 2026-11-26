package rw.ikiminaconnect.secretary;

import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;

public record CreateMeetingRequest(
        @NotBlank @Size(max = 120) String title,
        @NotNull LocalDate date,
        @NotBlank String time,
        @NotBlank @Size(max = 120) String location,
        @NotEmpty @Size(max = 30) List<@NotBlank @Size(max = 300) String> agenda) {
}
