package rw.ikiminaconnect.secretary;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rw.ikiminaconnect.audit.AuditService;
import rw.ikiminaconnect.common.NotFoundException;

/**
 * Meetings, announcements, and documents — roadmap phase 12. Grouped in one
 * service since all three are small, org-operations content with identical
 * staff/plain-member read-visibility rules, not because they share any
 * business logic beyond that.
 *
 * <p>Read-visibility filtering is added beyond what the frontend mock does:
 * member/Announcements.tsx shows every announcement regardless of audience,
 * and member/Documents.tsx only hides admins-only documents via a
 * client-side filter. Here it's enforced server-side — a plain member's
 * request never returns admins-only rows at all.
 */
@Service
public class SecretaryOpsService {

    private final MeetingRepository meetingRepository;
    private final AnnouncementRepository announcementRepository;
    private final DocumentRepository documentRepository;
    private final AuditService auditService;

    public SecretaryOpsService(
            MeetingRepository meetingRepository,
            AnnouncementRepository announcementRepository,
            DocumentRepository documentRepository,
            AuditService auditService) {
        this.meetingRepository = meetingRepository;
        this.announcementRepository = announcementRepository;
        this.documentRepository = documentRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<MeetingDto> listMeetings(UUID organizationId) {
        return meetingRepository.findAllByOrganizationIdOrderByMeetingDateDesc(organizationId).stream()
                .map(MeetingDto::from)
                .toList();
    }

    @Transactional
    public MeetingDto createMeeting(UUID organizationId, CreateMeetingRequest request, UUID actorId, String actorName) {
        Meeting meeting = new Meeting(organizationId, request.title(), request.date(), request.time(),
                request.location(), request.agenda(), actorName);
        meeting = meetingRepository.save(meeting);
        auditService.record(organizationId, actorId, actorName, "Scheduled meeting", meeting.getTitle());
        return MeetingDto.from(meeting);
    }

    @Transactional
    public MeetingDto recordMinutes(
            UUID organizationId, UUID meetingId, RecordMinutesRequest request, UUID actorId, String actorName) {
        Meeting meeting = meetingRepository.findByIdAndOrganizationId(meetingId, organizationId)
                .orElseThrow(() -> new NotFoundException("Meeting not found."));
        meeting.recordMinutes(request.minutesSummary());
        auditService.record(organizationId, actorId, actorName, "Recorded meeting minutes", meeting.getTitle());
        return MeetingDto.from(meeting);
    }

    @Transactional(readOnly = true)
    public List<AnnouncementDto> listAnnouncements(UUID organizationId, boolean isStaff) {
        List<Announcement> announcements = isStaff
                ? announcementRepository.findAllByOrganizationIdOrderByAnnouncementDateDesc(organizationId)
                : announcementRepository.findVisibleToPlainMembers(organizationId);
        return announcements.stream().map(AnnouncementDto::from).toList();
    }

    @Transactional
    public AnnouncementDto createAnnouncement(
            UUID organizationId, CreateAnnouncementRequest request, UUID actorId, String actorName) {
        Announcement announcement = new Announcement(organizationId, request.title(), request.body(),
                request.priority(), actorName, request.audience());
        announcement = announcementRepository.save(announcement);
        auditService.record(organizationId, actorId, actorName, "Published announcement", announcement.getTitle());
        return AnnouncementDto.from(announcement);
    }

    @Transactional(readOnly = true)
    public List<DocumentDto> listDocuments(UUID organizationId, boolean isStaff) {
        List<DocumentItem> documents = isStaff
                ? documentRepository.findAllByOrganizationIdOrderByUploadedDateDesc(organizationId)
                : documentRepository.findVisibleToPlainMembers(organizationId);
        return documents.stream().map(DocumentDto::from).toList();
    }

    @Transactional
    public DocumentDto addDocument(UUID organizationId, CreateDocumentRequest request, UUID actorId, String actorName) {
        DocumentItem document = new DocumentItem(organizationId, request.name(), request.category(),
                request.fileType(), actorName, request.sizeKb(), request.visibility());
        document = documentRepository.save(document);
        auditService.record(organizationId, actorId, actorName, "Added document", document.getName());
        return DocumentDto.from(document);
    }
}
