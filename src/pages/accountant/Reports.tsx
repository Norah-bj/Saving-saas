import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartCard } from "@/components/shared/chart-card";
import { DataTable } from "@/components/shared/data-table";
import { DonutChart } from "@/components/charts/donut-chart";
import { BarComparisonChart } from "@/components/charts/bar-comparison-chart";
import { useDataStore } from "@/lib/store/data-store";
import { formatRwf } from "@/lib/format";
import { MOCK_TODAY } from "@/lib/mock-data";
import { LOAN_STATUS_LABEL, LOAN_STATUS_ORDER, type LoanStatus } from "@/lib/types";

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

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
}

function lastMonths(count: number) {
  const today = new Date(MOCK_TODAY);
  const months: { key: string; label: string }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-RW", { month: "short", year: "2-digit" }),
    });
  }
  return months;
}

export default function AccountantReportsPage() {
  const organization = useDataStore((s) => s.organization);
  const members = useDataStore((s) => s.members);
  const loans = useDataStore((s) => s.loans);
  const savingsBalance = useDataStore((s) => s.savingsBalance);
  const savingsLedger = useDataStore((s) => s.savingsLedger);
  const ledgerTransactions = useDataStore((s) => s.ledgerTransactions);

  const orgMembers = members.filter((m) => m.organizationId === organization.id);

  const totalSavings = orgMembers.reduce((sum, m) => sum + savingsBalance(m.id), 0);
  const totalLoanPortfolio = loans
    .filter((l) => l.status === "disbursed" || l.status === "repaying")
    .reduce((sum, l) => sum + l.remainingBalance, 0);
  const totalInterestIncome = ledgerTransactions
    .filter((t) => t.type === "interest-income")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalInsuranceCollected = ledgerTransactions
    .filter((t) => t.type === "insurance-fee")
    .reduce((sum, t) => sum + t.amount, 0);

  const portfolioByStatus = LOAN_STATUS_ORDER.map((status) => ({
    key: status,
    label: LOAN_STATUS_LABEL[status],
    value: loans.filter((l) => l.status === status).length,
    color: STATUS_COLORS[status],
  })).filter((d) => d.value > 0);

  const months = lastMonths(8);
  const interestTrend = months.map((m) => ({
    month: m.label,
    interest: ledgerTransactions
      .filter((t) => t.type === "interest-income" && monthKey(t.date) === m.key)
      .reduce((sum, t) => sum + t.amount, 0),
  }));

  const contributionsTrend = months.map((m) => {
    const total = orgMembers.reduce((sum, member) => {
      const ledger = savingsLedger[member.id] ?? [];
      return (
        sum +
        ledger
          .filter((tx) => tx.type !== "loan-repayment" && monthKey(tx.date) === m.key)
          .reduce((s, tx) => s + tx.amount, 0)
      );
    }, 0);
    return { month: m.label, contributions: total };
  });

  const metrics = [
    { label: "Total Org Savings", value: totalSavings },
    { label: "Total Loan Portfolio", value: totalLoanPortfolio },
    { label: "Total Interest Income", value: totalInterestIncome },
    { label: "Total Insurance Collected", value: totalInsuranceCollected },
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
            centerValue={String(loans.length)}
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
