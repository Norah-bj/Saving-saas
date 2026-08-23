package rw.ikiminaconnect.loan;

import java.math.BigDecimal;

public record RepaymentScheduleRowDto(
        int month, BigDecimal principal, BigDecimal interest, BigDecimal installment, BigDecimal balanceAfter) {

    public static RepaymentScheduleRowDto from(LoanCalculator.RepaymentScheduleRow row) {
        return new RepaymentScheduleRowDto(
                row.month(), row.principal(), row.interest(), row.installment(), row.balanceAfter());
    }
}
