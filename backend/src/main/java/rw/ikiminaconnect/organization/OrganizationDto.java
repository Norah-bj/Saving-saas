package rw.ikiminaconnect.organization;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record OrganizationDto(
        UUID id, String name, String shortName, String slug, String district, String sector,
        String address, String contactEmail, String contactPhone, String logoInitials,
        String brandColor, String stampLabel, String plan, String status,
        String legalRepresentativeName, String legalRepresentativeTitle,
        BigDecimal shareValueRwf, BigDecimal loanInterestRate, BigDecimal loanInsuranceRate,
        Integer minMonthsBeforeEligible, List<Integer> allowedRepaymentPeriods,
        // Both only actually used by super-admin/Organizations.tsx and Analytics.tsx today —
        // OrganizationController's self-scoped callers get real values too, just unused so far.
        Instant createdAt, long memberCount) {

    public static OrganizationDto from(Organization o, long memberCount) {
        return new OrganizationDto(
                o.getId(), o.getName(), o.getShortName(), o.getSlug(), o.getDistrict(), o.getSector(),
                o.getAddress(), o.getContactEmail(), o.getContactPhone(), o.getLogoInitials(),
                o.getBrandColor(), o.getStampLabel(), o.getPlan().name(), o.getStatus().name(),
                o.getLegalRepresentativeName(), o.getLegalRepresentativeTitle(), o.getShareValueRwf(),
                o.getLoanInterestRate(), o.getLoanInsuranceRate(), o.getMinMonthsBeforeEligible(),
                o.getAllowedRepaymentPeriods(), o.getCreatedAt(), memberCount);
    }
}
