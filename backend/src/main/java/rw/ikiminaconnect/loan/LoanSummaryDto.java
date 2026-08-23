package rw.ikiminaconnect.loan;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record LoanSummaryDto(
        UUID id,
        String contractNumber,
        UUID memberId,
        BigDecimal amount,
        String purpose,
        int periodMonths,
        LoanStatus status,
        LocalDate appliedDate,
        int riskScore,
        String riskBand) {

    public static LoanSummaryDto from(Loan loan) {
        return new LoanSummaryDto(
                loan.getId(), loan.getContractNumber(), loan.getMemberId(), loan.getAmount(),
                loan.getPurpose(), loan.getPeriodMonths(), loan.getStatus(), loan.getAppliedDate(),
                loan.getRiskScore(), LoanCalculator.riskBand(loan.getRiskScore()));
    }
}
