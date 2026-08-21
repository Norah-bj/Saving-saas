package rw.ikiminaconnect.auth;

import java.util.List;
import java.util.UUID;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        long expiresIn,
        UserSummary user) {

    public record UserSummary(
            UUID id,
            UUID organizationId,
            String fullName,
            List<String> roles,
            boolean committeeChair) {
    }
}
