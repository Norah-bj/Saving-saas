package rw.ikiminaconnect.organization;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import rw.ikiminaconnect.audit.AuditService;
import rw.ikiminaconnect.common.BadRequestException;
import rw.ikiminaconnect.common.NotFoundException;

/**
 * Uploads and serves an organization's logo. The file type is decided from
 * the file's own bytes (PNG, JPEG or WebP signatures), never from its name or
 * the browser's claimed content type, and SVG is refused because it can carry
 * scripts.
 */
@Service
public class OrganizationLogoService {

    public static final long MAX_BYTES = 1024 * 1024;

    private final OrganizationRepository organizationRepository;
    private final OrganizationLogoRepository logoRepository;
    private final OrganizationService organizationService;
    private final AuditService auditService;

    public OrganizationLogoService(
            OrganizationRepository organizationRepository,
            OrganizationLogoRepository logoRepository,
            OrganizationService organizationService,
            AuditService auditService) {
        this.organizationRepository = organizationRepository;
        this.logoRepository = logoRepository;
        this.organizationService = organizationService;
        this.auditService = auditService;
    }

    @Transactional
    public OrganizationDto upload(UUID organizationId, MultipartFile file, UUID actorId, String actorName) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Choose an image file to upload.");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new BadRequestException("The logo must be 1 MB or smaller.");
        }
        byte[] data;
        try {
            data = file.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        String contentType = detectImageType(data)
                .orElseThrow(() -> new BadRequestException("Upload a PNG, JPG or WebP image."));

        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new NotFoundException("Organization not found."));
        OrganizationLogo logo = logoRepository.findById(organizationId)
                .map(existing -> {
                    existing.replace(contentType, data);
                    return existing;
                })
                .orElseGet(() -> new OrganizationLogo(organizationId, contentType, data));
        logoRepository.save(logo);
        organization.setLogoUpdatedAt(logo.getUpdatedAt());
        auditService.record(organizationId, actorId, actorName, "Updated organization logo", organization.getName());
        return organizationService.get(organizationId);
    }

    @Transactional
    public OrganizationDto remove(UUID organizationId, UUID actorId, String actorName) {
        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new NotFoundException("Organization not found."));
        logoRepository.deleteById(organizationId);
        organization.setLogoUpdatedAt(null);
        auditService.record(organizationId, actorId, actorName, "Removed organization logo", organization.getName());
        return organizationService.get(organizationId);
    }

    @Transactional(readOnly = true)
    public Optional<OrganizationLogo> find(UUID organizationId) {
        return logoRepository.findById(organizationId);
    }

    /** PNG, JPEG or WebP by magic bytes; anything else (including SVG) is refused. */
    static Optional<String> detectImageType(byte[] d) {
        if (d.length >= 8 && (d[0] & 0xFF) == 0x89 && d[1] == 'P' && d[2] == 'N' && d[3] == 'G') {
            return Optional.of("image/png");
        }
        if (d.length >= 3 && (d[0] & 0xFF) == 0xFF && (d[1] & 0xFF) == 0xD8 && (d[2] & 0xFF) == 0xFF) {
            return Optional.of("image/jpeg");
        }
        if (d.length >= 12 && d[0] == 'R' && d[1] == 'I' && d[2] == 'F' && d[3] == 'F'
                && d[8] == 'W' && d[9] == 'E' && d[10] == 'B' && d[11] == 'P') {
            return Optional.of("image/webp");
        }
        return Optional.empty();
    }
}
