package rw.ikiminaconnect.organization;

import java.time.Duration;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import rw.ikiminaconnect.security.CurrentUser;

@RestController
@RequestMapping("/api/v1/organizations/{id}/logo")
public class OrganizationLogoController {

    private final OrganizationLogoService logoService;

    public OrganizationLogoController(OrganizationLogoService logoService) {
        this.logoService = logoService;
    }

    /**
     * Public (see SecurityConfig): an {@code <img>} tag can't send a bearer
     * token, and a logo is not sensitive — it already appears on statements and
     * contracts. Clients add {@code ?v=<logoUpdatedAt>} so a new upload shows
     * immediately while the old URL stays cacheable.
     */
    @GetMapping
    public ResponseEntity<byte[]> get(@PathVariable UUID id) {
        return logoService.find(id)
                .map(logo -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(logo.getContentType()))
                        .cacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePublic())
                        .header("X-Content-Type-Options", "nosniff")
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                        .body(logo.getData()))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("#id == authentication.principal.organizationId() and hasRole('ORG_ADMIN')")
    public OrganizationDto upload(
            @AuthenticationPrincipal CurrentUser currentUser,
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file) {
        return logoService.upload(id, file, currentUser.userId(), currentUser.fullName());
    }

    @DeleteMapping
    @PreAuthorize("#id == authentication.principal.organizationId() and hasRole('ORG_ADMIN')")
    public OrganizationDto remove(@AuthenticationPrincipal CurrentUser currentUser, @PathVariable UUID id) {
        return logoService.remove(id, currentUser.userId(), currentUser.fullName());
    }
}
