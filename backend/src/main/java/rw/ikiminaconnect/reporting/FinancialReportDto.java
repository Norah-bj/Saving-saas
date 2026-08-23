package rw.ikiminaconnect.reporting;

import java.math.BigDecimal;
import java.util.List;

public record FinancialReportDto(
        BigDecimal totalSavings,
        BigDecimal totalLoanPortfolio,
        BigDecimal totalInterestIncome,
        BigDecimal totalInsuranceCollected,
        List<LoanStatusSlice> portfolioByStatus,
        List<MonthPoint> interestTrend,
        List<MonthPoint> contributionsTrend) {
}
