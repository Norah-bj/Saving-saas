import { PiggyBank, Landmark, TrendingUp, Percent } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/shared/chart-card";
import { TrendLineChart } from "@/components/charts/trend-line-chart";
import { BarComparisonChart } from "@/components/charts/bar-comparison-chart";
import { useOrganization } from "@/lib/api/organization";
import { useAccountantDashboard } from "@/lib/api/reporting";
import { formatRwf } from "@/lib/format";

export default function AccountantDashboardPage() {
  const { data: organization } = useOrganization();
  const { data } = useAccountantDashboard();

  if (!organization || !data) return null;

  const savingsGrowth = data.savingsGrowth.map((p) => ({ month: p.month, balance: p.value }));
  const cashFlow = data.cashFlow.map((p) => ({ month: p.month, in: p.moneyIn, out: p.moneyOut }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Accountant Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Financial overview for {organization.name}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Org Savings"
          value={formatRwf(data.totalOrgSavings)}
          icon={PiggyBank}
          description={`${data.memberCount} members`}
        />
        <StatCard
          label="Active Loan Portfolio"
          value={formatRwf(data.activeLoanPortfolio)}
          icon={Landmark}
          description="Outstanding balance"
        />
        <StatCard
          label="This Month's Contributions"
          value={formatRwf(data.thisMonthContributions)}
          icon={TrendingUp}
          description={data.thisMonthLabel}
        />
        <StatCard
          label="Total Interest Income"
          value={formatRwf(data.totalInterestIncome)}
          icon={Percent}
          description="All-time"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Savings Growth" description="Aggregate org savings over the last 8 months">
          <TrendLineChart
            data={savingsGrowth}
            xKey="month"
            series={[{ key: "balance", label: "Total Savings", color: "var(--chart-1)" }]}
            valueFormatter={(v) => `${Math.round(v / 1000000)}M`}
          />
        </ChartCard>
        <ChartCard title="Cash Flow" description="Money in vs loan disbursements out, by month">
          <BarComparisonChart
            data={cashFlow}
            xKey="month"
            series={[
              { key: "in", label: "Money In", color: "var(--chart-2)" },
              { key: "out", label: "Loan Disbursements", color: "var(--chart-4)" },
            ]}
            valueFormatter={(v) => `${Math.round(v / 1000)}k`}
          />
        </ChartCard>
      </div>
    </div>
  );
}
