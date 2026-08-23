package rw.ikiminaconnect.organization;

import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rw.ikiminaconnect.audit.AuditService;
import rw.ikiminaconnect.common.NotFoundException;

@Service
public class OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final AuditService auditService;

    public OrganizationService(OrganizationRepository organizationRepository, AuditService auditService) {
        this.organizationRepository = organizationRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public OrganizationDto get(UUID organizationId) {
        return OrganizationDto.from(find(organizationId));
    }

    @Transactional
    public OrganizationDto updateProfile(
            UUID organizationId, UpdateOrganizationProfileRequest request, UUID actorId, String actorName) {
        Organization organization = find(organizationId);
        organization.updateProfile(request.name(), request.shortName(), request.district(), request.sector(),
                request.address(), request.contactEmail(), request.contactPhone(), request.logoInitials(),
                request.brandColor(), request.stampLabel());
        auditService.record(organizationId, actorId, actorName, "Updated organization profile", organization.getName());
        return OrganizationDto.from(organization);
    }

    @Transactional
    public OrganizationDto updateLoanPolicy(
            UUID organizationId, UpdateOrganizationLoanPolicyRequest request, UUID actorId, String actorName) {
        Organization organization = find(organizationId);
        organization.updateLoanPolicy(request.loanInterestRate(), request.loanInsuranceRate(),
                request.minMonthsBeforeEligible(), request.allowedRepaymentPeriods());
        auditService.record(organizationId, actorId, actorName, "Updated loan policy", organization.getName());
        return OrganizationDto.from(organization);
    }

    private Organization find(UUID organizationId) {
        return organizationRepository.findById(organizationId)
                .orElseThrow(() -> new NotFoundException("Organization not found."));
    }
}
