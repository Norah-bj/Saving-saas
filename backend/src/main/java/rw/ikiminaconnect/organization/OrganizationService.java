package rw.ikiminaconnect.organization;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rw.ikiminaconnect.audit.AuditService;
import rw.ikiminaconnect.common.ConflictException;
import rw.ikiminaconnect.common.NotFoundException;
import rw.ikiminaconnect.member.MemberRepository;

@Service
public class OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final MemberRepository memberRepository;
    private final AuditService auditService;

    public OrganizationService(
            OrganizationRepository organizationRepository,
            MemberRepository memberRepository,
            AuditService auditService) {
        this.organizationRepository = organizationRepository;
        this.memberRepository = memberRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public OrganizationDto get(UUID organizationId) {
        Organization organization = find(organizationId);
        return OrganizationDto.from(organization, memberRepository.countByOrganizationId(organizationId));
    }

    @Transactional
    public OrganizationDto updateProfile(
            UUID organizationId, UpdateOrganizationProfileRequest request, UUID actorId, String actorName) {
        Organization organization = find(organizationId);
        organization.updateProfile(request.name(), request.shortName(), request.district(), request.sector(),
                request.address(), request.contactEmail(), request.contactPhone(), request.logoInitials(),
                request.brandColor(), request.stampLabel());
        auditService.record(organizationId, actorId, actorName, "Updated organization profile", organization.getName());
        return OrganizationDto.from(organization, memberRepository.countByOrganizationId(organizationId));
    }

    @Transactional
    public OrganizationDto updateLoanPolicy(
            UUID organizationId, UpdateOrganizationLoanPolicyRequest request, UUID actorId, String actorName) {
        Organization organization = find(organizationId);
        organization.updateLoanPolicy(request.loanInterestRate(), request.loanInsuranceRate(),
                request.minMonthsBeforeEligible(), request.allowedRepaymentPeriods());
        auditService.record(organizationId, actorId, actorName, "Updated loan policy", organization.getName());
        return OrganizationDto.from(organization, memberRepository.countByOrganizationId(organizationId));
    }

    /**
     * Platform (SUPER_ADMIN) only. One grouped query for every org's member
     * count rather than one countByOrganizationId call per org in the list.
     */
    @Transactional(readOnly = true)
    public List<OrganizationDto> listAll() {
        Map<UUID, Long> counts = memberRepository.countAllGroupedByOrganization().stream()
                .collect(Collectors.toMap(
                        MemberRepository.OrganizationMemberCount::getOrganizationId,
                        MemberRepository.OrganizationMemberCount::getCount));
        return organizationRepository.findAll().stream()
                .map(o -> OrganizationDto.from(o, counts.getOrDefault(o.getId(), 0L)))
                .toList();
    }

    @Transactional
    public OrganizationDto updateStatusAsPlatform(
            UUID organizationId, UpdateOrganizationStatusRequest request, UUID actorId, String actorName) {
        Organization organization = find(organizationId);
        if (organization.getStatus() == request.status()) {
            throw new ConflictException("Organization is already " + request.status() + ".");
        }
        organization.updateStatus(request.status());
        auditService.record(organizationId, actorId, actorName,
                "Set organization status to " + request.status(), organization.getName());
        return OrganizationDto.from(organization, memberRepository.countByOrganizationId(organizationId));
    }

    @Transactional
    public OrganizationDto updatePlanAsPlatform(
            UUID organizationId, UpdateOrganizationPlanRequest request, UUID actorId, String actorName) {
        Organization organization = find(organizationId);
        organization.updatePlan(request.plan());
        auditService.record(organizationId, actorId, actorName,
                "Changed subscription plan to " + request.plan(), organization.getName());
        return OrganizationDto.from(organization, memberRepository.countByOrganizationId(organizationId));
    }

    private Organization find(UUID organizationId) {
        return organizationRepository.findById(organizationId)
                .orElseThrow(() -> new NotFoundException("Organization not found."));
    }
}
