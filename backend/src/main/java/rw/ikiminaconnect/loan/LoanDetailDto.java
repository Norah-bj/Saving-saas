package rw.ikiminaconnect.loan;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record LoanDetailDto(
        UUID id,
        String contractNumber,
        UUID memberId,
        BigDecimal amount,
        String purpose,
        int periodMonths,
        BigDecimal interestRate,
        boolean insuranceRequired,
        BigDecimal insuranceFee,
        BigDecimal monthlyInstallment,
        BigDecimal totalPayable,
        BigDecimal remainingBalance,
        LoanStatus status,
        LocalDate appliedDate,
        LocalDate approvedDate,
        LocalDate disbursedDate,
        int riskScore,
        String riskBand,
        String committeeNotes,
        List<UUID> guarantorIds,
        List<LoanTimelineEventDto> timeline) {

    public static LoanDetailDto from(Loan loan, List<UUID> guarantorIds, List<LoanTimelineEventDto> timeline) {
        return new LoanDetailDto(
                loan.getId(), loan.getContractNumber(), loan.getMemberId(), loan.getAmount(), loan.getPurpose(),
                loan.getPeriodMonths(), loan.getInterestRate(), loan.isInsuranceRequired(), loan.getInsuranceFee(),
                loan.getMonthlyInstallment(), loan.getTotalPayable(), loan.getRemainingBalance(), loan.getStatus(),
                loan.getAppliedDate(), loan.getApprovedDate(), loan.getDisbursedDate(), loan.getRiskScore(),
                LoanCalculator.riskBand(loan.getRiskScore()), loan.getCommitteeNotes(), guarantorIds, timeline);
    }
}
