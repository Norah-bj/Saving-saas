package rw.ikiminaconnect.organization;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

/**
 * Tenant record. Mirrors src/lib/types.ts's Organization interface, plus the
 * org-level policy settings (share value, interest/insurance rates, minimum
 * saving) that make lending/savings rules configurable per tenant instead of
 * hardcoded — see docs/BACKEND_CONTRACT.md. `memberCount` and `avatarInitials`
 * from the frontend type are deliberately not columns here (derived values).
 */
@Entity
@Table(name = "organizations")
public class Organization {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(name = "short_name", nullable = false)
    private String shortName;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(nullable = false)
    private String district;

    @Column(nullable = false)
    private String sector;

    @Column(nullable = false)
    private String address;

    @Column(name = "contact_email", nullable = false)
    private String contactEmail;

    @Column(name = "contact_phone", nullable = false)
    private String contactPhone;

    @Column(name = "logo_initials", nullable = false)
    private String logoInitials;

    @Column(name = "brand_color", nullable = false)
    private String brandColor;

    @Column(name = "stamp_label", nullable = false)
    private String stampLabel;

    // Plain TEXT column with a CHECK constraint in the DB (see V1__vertical_slice.sql) —
    // not a native Postgres enum type. @Enumerated(STRING) matches the enum's name()
    // against the CHECK'd values directly, no custom converter needed since these two
    // vocabularies (unlike Role/SavingsTxType) have no hyphens to work around.
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SubscriptionPlan plan = SubscriptionPlan.starter;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrganizationStatus status = OrganizationStatus.trial;

    @Column(name = "legal_representative_name", nullable = false)
    private String legalRepresentativeName;

    @Column(name = "legal_representative_title", nullable = false)
    private String legalRepresentativeTitle;

    @Column(name = "share_value_rwf", nullable = false, precision = 14, scale = 2)
    private BigDecimal shareValueRwf;

    @Column(name = "loan_interest_rate", nullable = false, precision = 5, scale = 4)
    private BigDecimal loanInterestRate;

    @Column(name = "loan_insurance_rate", nullable = false, precision = 5, scale = 4)
    private BigDecimal loanInsuranceRate;

    @Column(name = "min_months_before_eligible", nullable = false)
    private Integer minMonthsBeforeEligible = 3;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "allowed_repayment_periods", nullable = false)
    private List<Integer> allowedRepaymentPeriods;

    @Column(name = "min_monthly_saving_rwf", nullable = false, precision = 14, scale = 2)
    private BigDecimal minMonthlySavingRwf = BigDecimal.ZERO;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Organization() {
        // JPA
    }

    public Organization(String name, String shortName, String slug, String district, String sector,
                         String address, String contactEmail, String contactPhone, String logoInitials,
                         String brandColor, String stampLabel, String legalRepresentativeName,
                         String legalRepresentativeTitle, BigDecimal shareValueRwf,
                         BigDecimal loanInterestRate, BigDecimal loanInsuranceRate,
                         Integer minMonthsBeforeEligible, List<Integer> allowedRepaymentPeriods,
                         BigDecimal minMonthlySavingRwf) {
        this.name = name;
        this.shortName = shortName;
        this.slug = slug;
        this.district = district;
        this.sector = sector;
        this.address = address;
        this.contactEmail = contactEmail;
        this.contactPhone = contactPhone;
        this.logoInitials = logoInitials;
        this.brandColor = brandColor;
        this.stampLabel = stampLabel;
        this.legalRepresentativeName = legalRepresentativeName;
        this.legalRepresentativeTitle = legalRepresentativeTitle;
        this.shareValueRwf = shareValueRwf;
        this.loanInterestRate = loanInterestRate;
        this.loanInsuranceRate = loanInsuranceRate;
        this.minMonthsBeforeEligible = minMonthsBeforeEligible;
        this.allowedRepaymentPeriods = allowedRepaymentPeriods;
        this.minMonthlySavingRwf = minMonthlySavingRwf;
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getShortName() {
        return shortName;
    }

    public String getSlug() {
        return slug;
    }

    public String getDistrict() {
        return district;
    }

    public String getSector() {
        return sector;
    }

    public String getAddress() {
        return address;
    }

    public String getContactEmail() {
        return contactEmail;
    }

    public String getContactPhone() {
        return contactPhone;
    }

    public String getLogoInitials() {
        return logoInitials;
    }

    public String getBrandColor() {
        return brandColor;
    }

    public String getStampLabel() {
        return stampLabel;
    }

    public SubscriptionPlan getPlan() {
        return plan;
    }

    public OrganizationStatus getStatus() {
        return status;
    }

    public String getLegalRepresentativeName() {
        return legalRepresentativeName;
    }

    public String getLegalRepresentativeTitle() {
        return legalRepresentativeTitle;
    }

    public BigDecimal getShareValueRwf() {
        return shareValueRwf;
    }

    public BigDecimal getLoanInterestRate() {
        return loanInterestRate;
    }

    public BigDecimal getLoanInsuranceRate() {
        return loanInsuranceRate;
    }

    public Integer getMinMonthsBeforeEligible() {
        return minMonthsBeforeEligible;
    }

    public List<Integer> getAllowedRepaymentPeriods() {
        return allowedRepaymentPeriods;
    }

    public BigDecimal getMinMonthlySavingRwf() {
        return minMonthlySavingRwf;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
