package rw.ikiminaconnect.common;

import java.time.Instant;
import java.util.Map;

public record ApiError(String error, String message, Instant timestamp, Map<String, String> details) {

    public static ApiError of(String error, String message) {
        return new ApiError(error, message, Instant.now(), null);
    }

    public static ApiError of(String error, String message, Map<String, String> details) {
        return new ApiError(error, message, Instant.now(), details);
    }
}
