"use client";

import { Wallet, Coins } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/shared/chart-card";
import { BarComparisonChart } from "@/components/charts/bar-comparison-chart";
import { useDataStore } from "@/lib/store/data-store";
import { formatRwf } from "@/lib/format";
import { riskBand } from "@/lib/loan-calculator";

export default function LoanCommitteeReportsPage() {
  const loans = useDataStore((s) => s.loans);

  const totalPortfolioValue = loans.reduce((sum, l) => sum + l.amount, 0);
  const averageLoanSize = loans.length ? Math.round(totalPortfolioValue / loans.length) : 0;

  const byPurpose = new Map<string, number>();
  for (const loan of loans) {
    byPurpose.set(loan.purpose, (byPurpose.get(loan.purpose) ?? 0) + loan.amount);
  }
  const purposeData = Array.from(byPurpose.entries())
    .map(([purpose, amount]) => ({ purpose, amount }))
    .sort((a, b) => b.amount - a.amount);

  const riskBands = [
    { key: "low", label: "Low Risk (75+)" },
    { key: "moderate", label: "Moderate Risk (50-74)" },
    { key: "high", label: "High Risk (<50)" },
  ];
  const riskDistribution = riskBands.map((b) => ({
    band: b.label,
    count: loans.filter((l) => {
      const t = riskBand(l.riskScore).label;
      return (
        (b.key === "low" && t === "Low Risk") ||
        (b.key === "moderate" && t === "Moderate Risk") ||
        (b.key === "high" && t === "High Risk")
      );
    }).length,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Reports &amp; Statistics</h1>
        <p className="text-sm text-muted-foreground">
          Portfolio composition and applicant risk across every loan on record.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Average Loan Size"
          value={formatRwf(averageLoanSize)}
          icon={Coins}
          description={`Across ${loans.length} loans`}
        />
        <StatCard
          label="Total Portfolio Value"
          value={formatRwf(totalPortfolioValue)}
          icon={Wallet}
          description="All loans ever issued"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Loan Amounts by Purpose" description="Total requested amount, grouped by purpose">
          <BarComparisonChart
            data={purposeData}
            xKey="purpose"
            series={[{ key: "amount", label: "Amount", color: "var(--chart-1)" }]}
            valueFormatter={(v) => `${Math.round(v / 1000000)}M`}
          />
        </ChartCard>
        <ChartCard title="Risk Score Distribution" description="Loans grouped by risk band">
          <BarComparisonChart
            data={riskDistribution}
            xKey="band"
            series={[{ key: "count", label: "Loans", color: "var(--chart-3)" }]}
          />
        </ChartCard>
      </div>
    </div>
  );
}
