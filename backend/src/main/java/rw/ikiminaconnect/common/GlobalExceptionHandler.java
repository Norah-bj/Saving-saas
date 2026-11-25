package rw.ikiminaconnect.common;

import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(NotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiError.of("not_found", ex.getMessage()));
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ApiError> handleConflict(ConflictException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiError.of("conflict", ex.getMessage()));
    }

    @ExceptionHandler({ForbiddenException.class, AccessDeniedException.class})
    public ResponseEntity<ApiError> handleForbidden(RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiError.of("forbidden", ex.getMessage()));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiError> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiError.of("unauthorized", "Invalid email or password."));
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiError> handleBadRequest(BadRequestException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiError.of("bad_request", ex.getMessage()));
    }

    /**
     * Without this, an upload past application.yml's configured
     * max-file-size/max-request-size (10MB) fell through to the generic
     * catch-all below as an unhelpful 500 — see docs/CHANGELOG.md,
     * gap-closure phase 5 (payroll import hardening; the only multipart
     * upload endpoint in the app today, but this applies to any future one).
     */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiError> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(ApiError.of("payload_too_large", "This file is too large. The maximum upload size is 10MB."));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> details = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(fe ->
                details.put(fe.getField(), fe.getDefaultMessage()));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiError.of("validation_failed", "One or more fields are invalid.", details));
    }

    /** A path variable or query parameter of the wrong type: a non-UUID id, an unknown enum filter value. */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiError.of("bad_request", "Invalid value for '" + ex.getName() + "'."));
    }

    /** Missing or malformed JSON body, including unknown enum values and unparseable dates. */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleUnreadableBody(HttpMessageNotReadableException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiError.of("bad_request", "The request body is missing or malformed."));
    }

    /**
     * Catch-all for anything not handled above. Spring MVC's own client-error
     * exceptions (unknown path 404, wrong method 405, unsupported content type
     * 415, missing parameter 400, ...) implement {@link ErrorResponse} and keep
     * their 4xx status here instead of being reported as a server error.
     *
     * <p>Critical to have: without
     * this, an unhandled exception propagates to the servlet container's
     * default error handling, which internally forwards to /error — and
     * because JwtAuthenticationFilter is a OncePerRequestFilter that already
     * cleared SecurityContextHolder in its finally block for the original
     * request, that forwarded dispatch looks unauthenticated and gets
     * rejected by SecurityConfig's authenticationEntryPoint. The real error
     * (a 500, logged here) was masked as a misleading 401 "Authentication
     * required" — this is exactly what happened in this repo's own dev
     * testing before this handler existed. Logging at ERROR here is what
     * makes the real cause visible again.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception ex) {
        if (ex instanceof ErrorResponse errorResponse && errorResponse.getStatusCode().is4xxClientError()) {
            HttpStatusCode status = errorResponse.getStatusCode();
            String code = switch (status.value()) {
                case 404 -> "not_found";
                case 405 -> "method_not_allowed";
                case 415 -> "unsupported_media_type";
                default -> "bad_request";
            };
            String message = status.value() == 404 ? "Not found." : "This request isn't supported.";
            return ResponseEntity.status(status).body(ApiError.of(code, message));
        }
        log.error("Unhandled exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiError.of("internal_error", "Something went wrong. Please try again."));
    }
}
