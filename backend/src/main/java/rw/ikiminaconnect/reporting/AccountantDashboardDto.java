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
        List<CashFlowPoint> cashFlow,
        // org-admin/Dashboard.tsx only — accountant/Dashboard.tsx has no
        // shares stat, so this is simply unused there. totalShares * the
        // org's own share_value_rwf, computed server-side rather than
        // exposing raw share counts and making every caller redo the math.
        BigDecimal totalSharesValueRwf) {
}
