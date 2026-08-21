package rw.ikiminaconnect.loan;

import java.math.BigDecimal;
import java.util.List;

public record LoanCalculationResponse(
        BigDecimal amount,
        boolean guarantorRequired,
        BigDecimal interest,
        BigDecimal insuranceFee,
        BigDecimal totalPayable,
        BigDecimal monthlyInstallment,
        List<RepaymentScheduleRowDto> schedule,
        boolean eligible,
        int tenureMonths,
        int minMonthsBeforeEligible) {

    public static LoanCalculationResponse from(
            LoanCalculator.LoanCalculation calc, boolean eligible, int tenureMonths, int minMonths) {
        return new LoanCalculationResponse(
                calc.amount(), calc.guarantorRequired(), calc.interest(), calc.insuranceFee(),
                calc.totalPayable(), calc.monthlyInstallment(),
                calc.schedule().stream().map(RepaymentScheduleRowDto::from).toList(),
                eligible, tenureMonths, minMonths);
    }
}
