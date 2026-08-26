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
        String riskBand,
        LocalDate decidedDate) {

    /**
     * {@code decidedDate} lets list-only consumers (loan-committee dashboard/
     * reports) bucket approvals/rejections by month without a per-row detail
     * fetch. {@code approvedDate} is a real tracked column; there's no
     * dedicated "rejected date" column, so a rejection's decision moment is
     * approximated by {@code updatedAt} — set precisely at rejection time by
     * {@code Loan.rejectByCommittee}/{@code rejectByGuarantorDecline}, and
     * never touched again afterward. {@code null} for anything not yet decided.
     */
    public static LoanSummaryDto from(Loan loan) {
        LocalDate decidedDate = loan.getStatus() == LoanStatus.REJECTED
                ? loan.getUpdatedAt().atZone(java.time.ZoneId.systemDefault()).toLocalDate()
                : loan.getApprovedDate();
        return new LoanSummaryDto(
                loan.getId(), loan.getContractNumber(), loan.getMemberId(), loan.getAmount(),
                loan.getPurpose(), loan.getPeriodMonths(), loan.getStatus(), loan.getAppliedDate(),
                loan.getRiskScore(), LoanCalculator.riskBand(loan.getRiskScore()), decidedDate);
    }
}
