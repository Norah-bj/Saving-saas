package rw.ikiminaconnect.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Same password rule as {@link RegisterRequest}. */
public record AcceptInviteRequest(@NotBlank String token, @NotBlank @Size(min = 8) String password) {
}
