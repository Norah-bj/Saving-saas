package rw.ikiminaconnect.organization;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

/**
 * Rates are fractions (0.05 = 5%), matching how this backend stores and
 * returns them everywhere else (Organization, Loan) — not the frontend
 * mock's UI-facing whole-percentage convention. Whatever eventually wires
 * loan-committee/Policy.tsx to this endpoint must convert its whole-percentage
 * form inputs to a fraction first, same as the existing loan-calculation
 * unit-conversion note in docs/BUSINESS_RULES.md.
 */
public record UpdateOrganizationLoanPolicyRequest(
        @NotNull @DecimalMin("0") BigDecimal loanInterestRate,
        @NotNull @DecimalMin("0") BigDecimal loanInsuranceRate,
        @NotNull @Min(0) Integer minMonthsBeforeEligible,
        @NotEmpty List<Integer> allowedRepaymentPeriods) {
}
