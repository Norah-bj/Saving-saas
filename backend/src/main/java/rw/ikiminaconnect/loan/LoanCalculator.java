package rw.ikiminaconnect.loan;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * Ports src/lib/loan-calculator.ts exactly — same interest/insurance/schedule
 * math, same risk-score weighting. One deliberate deviation: the frontend's
 * riskScoreFor hardcodes its tenure-penalty threshold to a MIN_MONTHS_BEFORE_ELIGIBLE
 * constant (3) rather than reading the organization's own configured value —
 * this version takes that threshold as a parameter instead, since "3 months"
 * is APUPEKA's setting, not a platform constant (BACKEND_CONTRACT.md: nothing
 * should hardcode APUPEKA's specific values).
 */
public final class LoanCalculator {

    private LoanCalculator() {
    }

    public record RepaymentScheduleRow(
            int month, BigDecimal principal, BigDecimal interest, BigDecimal installment, BigDecimal balanceAfter) {
    }

    public record LoanCalculation(
            BigDecimal amount, boolean guarantorRequired, BigDecimal interest, BigDecimal insuranceFee,
            BigDecimal totalPayable, BigDecimal monthlyInstallment, List<RepaymentScheduleRow> schedule) {
    }

    public static LoanCalculation calculate(
            BigDecimal amount, BigDecimal memberSavings, int periodMonths,
            BigDecimal interestRate, BigDecimal insuranceRate) {
        boolean guarantorRequired = amount.compareTo(memberSavings) > 0;
        BigDecimal interest = round(amount.multiply(interestRate));
        BigDecimal insuranceFee = guarantorRequired ? round(amount.multiply(insuranceRate)) : BigDecimal.ZERO;
        BigDecimal totalPayable = amount.add(interest).add(insuranceFee);
        BigDecimal monthlyInstallment = periodMonths > 0
                ? round(divide(totalPayable, periodMonths))
                : BigDecimal.ZERO;

        BigDecimal monthlyPrincipal = periodMonths > 0 ? round(divide(amount, periodMonths)) : BigDecimal.ZERO;
        BigDecimal monthlyInterestPortion = periodMonths > 0
                ? round(divide(interest.add(insuranceFee), periodMonths))
                : BigDecimal.ZERO;

        List<RepaymentScheduleRow> schedule = new ArrayList<>();
        BigDecimal balance = totalPayable;
        for (int m = 1; m <= periodMonths; m++) {
            boolean isLast = m == periodMonths;
            BigDecimal principal = isLast
                    ? amount.subtract(monthlyPrincipal.multiply(BigDecimal.valueOf(periodMonths - 1L)))
                    : monthlyPrincipal;
            BigDecimal interestPortion = isLast
                    ? interest.add(insuranceFee).subtract(monthlyInterestPortion.multiply(BigDecimal.valueOf(periodMonths - 1L)))
                    : monthlyInterestPortion;
            BigDecimal installment = isLast ? balance : monthlyInstallment;
            balance = round(balance.subtract(installment));
            schedule.add(new RepaymentScheduleRow(
                    m, round(principal), round(interestPortion), round(installment),
                    balance.max(BigDecimal.ZERO)));
        }

        return new LoanCalculation(amount, guarantorRequired, interest, insuranceFee,
                round(totalPayable), monthlyInstallment, schedule);
    }

    public static int riskScore(
            BigDecimal amount, BigDecimal savings, int monthsAsMember, boolean hasGuarantors,
            BigDecimal salary, BigDecimal monthlyInstallment, int minMonthsBeforeEligible) {
        double score = 100;

        double savingsRatio = savings.signum() > 0
                ? amount.doubleValue() / savings.doubleValue()
                : (amount.signum() > 0 ? 5 : 0);
        if (savingsRatio > 3) score -= 35;
        else if (savingsRatio > 2) score -= 20;
        else if (savingsRatio > 1) score -= 10;

        if (monthsAsMember < minMonthsBeforeEligible) score -= 30;
        else if (monthsAsMember < 12) score -= 10;

        if (amount.compareTo(savings) > 0 && !hasGuarantors) score -= 25;

        double dsr = salary.signum() > 0 ? monthlyInstallment.doubleValue() / salary.doubleValue() : 1;
        if (dsr > 0.5) score -= 25;
        else if (dsr > 0.35) score -= 12;

        return (int) Math.max(5, Math.min(100, Math.round(score)));
    }

    public static String riskBand(int score) {
        if (score >= 75) return "Low Risk";
        if (score >= 50) return "Moderate Risk";
        return "High Risk";
    }

    private static BigDecimal divide(BigDecimal numerator, int denominator) {
        return numerator.divide(BigDecimal.valueOf(denominator), 10, RoundingMode.HALF_UP);
    }

    private static BigDecimal round(BigDecimal value) {
        return value.setScale(0, RoundingMode.HALF_UP);
    }
}
