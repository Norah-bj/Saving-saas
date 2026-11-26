package rw.ikiminaconnect.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import rw.ikiminaconnect.common.ValidationRules;

/** Same password rule as {@link RegisterRequest}. */
public record AcceptInviteRequest(@NotBlank String token, @NotBlank @Pattern(regexp = ValidationRules.PASSWORD, message = ValidationRules.PASSWORD_MESSAGE) String password) {
}
