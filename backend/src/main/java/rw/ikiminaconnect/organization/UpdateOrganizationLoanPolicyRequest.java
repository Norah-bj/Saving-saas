package rw.ikiminaconnect.organization;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

/** Rates are fractions (0.05 = 5%). Limits match the Loan Policy page. */
public record UpdateOrganizationLoanPolicyRequest(
        @NotNull @DecimalMin("0") @DecimalMax(value = "0.5", message = "Interest rate must be between 0 and 50%.")
        BigDecimal loanInterestRate,
        @NotNull @DecimalMin("0") @DecimalMax(value = "0.2", message = "Insurance rate must be between 0 and 20%.")
        BigDecimal loanInsuranceRate,
        @NotNull @Min(0) @Max(value = 60, message = "Use between 0 and 60 months.") Integer minMonthsBeforeEligible,
        @NotEmpty @Size(max = 12) List<@NotNull @Min(1) @Max(120) Integer> allowedRepaymentPeriods) {
}
