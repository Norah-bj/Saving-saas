package rw.ikiminaconnect.organization;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record OrganizationDto(
        UUID id, String name, String shortName, String slug, String district, String sector,
        String address, String contactEmail, String contactPhone, String logoInitials,
        String brandColor, String stampLabel, String plan, String status,
        String legalRepresentativeName, String legalRepresentativeTitle,
        BigDecimal loanInterestRate, BigDecimal loanInsuranceRate,
        Integer minMonthsBeforeEligible, List<Integer> allowedRepaymentPeriods) {

    public static OrganizationDto from(Organization o) {
        return new OrganizationDto(
                o.getId(), o.getName(), o.getShortName(), o.getSlug(), o.getDistrict(), o.getSector(),
                o.getAddress(), o.getContactEmail(), o.getContactPhone(), o.getLogoInitials(),
                o.getBrandColor(), o.getStampLabel(), o.getPlan().name(), o.getStatus().name(),
                o.getLegalRepresentativeName(), o.getLegalRepresentativeTitle(),
                o.getLoanInterestRate(), o.getLoanInsuranceRate(), o.getMinMonthsBeforeEligible(),
                o.getAllowedRepaymentPeriods());
    }
}
