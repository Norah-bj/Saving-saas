package rw.ikiminaconnect.reporting;

import java.math.BigDecimal;
import java.util.List;

public record AccountantDashboardDto(
        BigDecimal totalOrgSavings,
        long memberCount,
        BigDecimal activeLoanPortfolio,
        BigDecimal thisMonthContributions,
        String thisMonthLabel,
        BigDecimal totalInterestIncome,
        List<MonthPoint> savingsGrowth,
        List<CashFlowPoint> cashFlow) {
}
