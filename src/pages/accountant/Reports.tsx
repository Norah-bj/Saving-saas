import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartCard } from "@/components/shared/chart-card";
import { DataTable } from "@/components/shared/data-table";
import { DonutChart } from "@/components/charts/donut-chart";
import { BarComparisonChart } from "@/components/charts/bar-comparison-chart";
import { useFinancialReport } from "@/lib/api/reporting";
import { formatRwf } from "@/lib/format";
import { LOAN_STATUS_LABEL, type LoanStatus } from "@/lib/types";

const STATUS_COLORS: Record<LoanStatus, string> = {
  submitted: "var(--chart-1)",
  "under-review": "var(--chart-2)",
  "guarantor-approval": "var(--chart-3)",
  "committee-review": "var(--chart-4)",
  approved: "var(--chart-5)",
  rejected: "var(--chart-1)",
  "contract-generated": "var(--chart-2)",
  disbursed: "var(--chart-3)",
  repaying: "var(--chart-4)",
  completed: "var(--chart-5)",
};

export default function AccountantReportsPage() {
  const { data } = useFinancialReport();

  if (!data) return null;

  const portfolioByStatus = data.portfolioByStatus.map((s) => ({
    key: s.status,
    label: LOAN_STATUS_LABEL[s.status as LoanStatus],
    value: s.count,
    color: STATUS_COLORS[s.status as LoanStatus],
  }));
  const totalLoans = data.portfolioByStatus.reduce((sum, s) => sum + s.count, 0);

  const interestTrend = data.interestTrend.map((p) => ({ month: p.month, interest: p.value }));
  const contributionsTrend = data.contributionsTrend.map((p) => ({ month: p.month, contributions: p.value }));

  const metrics = [
    { label: "Total Org Savings", value: data.totalSavings },
    { label: "Total Loan Portfolio", value: data.totalLoanPortfolio },
    { label: "Total Interest Income", value: data.totalInterestIncome },
    { label: "Total Insurance Collected", value: data.totalInsuranceCollected },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Financial Reports</h1>
        <p className="text-sm text-muted-foreground">
          Portfolio composition, income trends, and key financial metrics.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Loan Portfolio by Status" description="All loans, grouped by current status">
          <DonutChart
            data={portfolioByStatus}
            centerValue={String(totalLoans)}
            centerLabel="Total Loans"
          />
        </ChartCard>
        <ChartCard title="Interest Income Trend" description="Interest income by month">
          <BarComparisonChart
            data={interestTrend}
            xKey="month"
            series={[{ key: "interest", label: "Interest Income", color: "var(--chart-2)" }]}
            valueFormatter={(v) => `${Math.round(v / 1000)}k`}
          />
        </ChartCard>
      </div>

      <ChartCard title="Monthly Contributions" description="Total member contributions by month">
        <BarComparisonChart
          data={contributionsTrend}
          xKey="month"
          series={[{ key: "contributions", label: "Contributions", color: "var(--chart-3)" }]}
          valueFormatter={(v) => `${Math.round(v / 1000000)}M`}
        />
      </ChartCard>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Key Financial Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: "Metric", cell: (r) => r.label },
              { header: "Value", cell: (r) => <span className="font-medium">{formatRwf(r.value)}</span> },
            ]}
            rows={metrics}
            rowKey={(r) => r.label}
          />
        </CardContent>
      </Card>
    </div>
  );
}
