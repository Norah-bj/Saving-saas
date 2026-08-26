import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";

interface MonthPointDto {
  month: string;
  value: number;
}

interface CashFlowPointDto {
  month: string;
  moneyIn: number;
  moneyOut: number;
}

/** Mirrors the backend's reporting.AccountantDashboardDto — pre-aggregated server-side, same computation the frontend mock used to do client-side. */
interface AccountantDashboardDto {
  totalOrgSavings: number;
  memberCount: number;
  activeLoanPortfolio: number;
  thisMonthContributions: number;
  thisMonthLabel: string;
  totalInterestIncome: number;
  savingsGrowth: MonthPointDto[];
  cashFlow: CashFlowPointDto[];
  /** org-admin/Dashboard.tsx's "Total Shares Value" only — unused by accountant/Dashboard.tsx. */
  totalSharesValueRwf: number;
}

export function useAccountantDashboard() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["reports", "accountant-dashboard"],
    queryFn: () => apiClient.get<AccountantDashboardDto>("/reports/accountant-dashboard"),
    enabled: !!accessToken,
  });
}

interface LoanStatusSliceDto {
  status: string;
  count: number;
}

/** Mirrors the backend's reporting.FinancialReportDto. */
interface FinancialReportDto {
  totalSavings: number;
  totalLoanPortfolio: number;
  totalInterestIncome: number;
  totalInsuranceCollected: number;
  portfolioByStatus: LoanStatusSliceDto[];
  interestTrend: MonthPointDto[];
  contributionsTrend: MonthPointDto[];
}

export function useFinancialReport() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["reports", "financial"],
    queryFn: () => apiClient.get<FinancialReportDto>("/reports/financial"),
    enabled: !!accessToken,
  });
}
