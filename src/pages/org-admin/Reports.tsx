import { Users, PiggyBank, HandCoins, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/shared/chart-card";
import { TrendLineChart } from "@/components/charts/trend-line-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { useOrganization } from "@/lib/api/organization";
import { useMembers } from "@/lib/api/members";
import { useLoans } from "@/lib/api/loans";
import { useAccountantDashboard, useFinancialReport } from "@/lib/api/reporting";
import { formatRwf } from "@/lib/format";

function membershipGrowthByYear(dateJoinedList: string[]) {
  if (dateJoinedList.length === 0) return [];
  const years = dateJoinedList.map((d) => new Date(d).getFullYear());
  const minYear = Math.min(...years);
  const maxYear = new Date().getFullYear();
  const result: { year: string; members: number }[] = [];
  let cumulative = 0;
  for (let y = minYear; y <= maxYear; y++) {
    cumulative += years.filter((yr) => yr === y).length;
    result.push({ year: String(y), members: cumulative });
  }
  return result;
}

const DECIDED_APPROVED = ["approved", "contract-generated", "disbursed", "repaying", "completed"];

export default function OrgAdminReportsPage() {
  const { data: organization } = useOrganization();
  const { data: orgMembers = [] } = useMembers();
  const { data: loans = [] } = useLoans();
  const { data: dashboard } = useAccountantDashboard();
  const { data: financial } = useFinancialReport();

  if (!organization || !dashboard || !financial) return null;

  const approvedCount = loans.filter((l) => DECIDED_APPROVED.includes(l.status)).length;
  const rejectedCount = loans.filter((l) => l.status === "rejected").length;
  const decidedCount = approvedCount + rejectedCount;
  const approvalRate = decidedCount > 0 ? Math.round((approvedCount / decidedCount) * 100) : 0;
  const totalDisbursed = loans
    .filter((l) => ["disbursed", "repaying", "completed"].includes(l.status))
    .reduce((sum, l) => sum + l.amount, 0);

  const savingsSeries = dashboard.savingsGrowth.map((p) => ({ month: p.month, balance: p.value }));
  const membershipSeries = membershipGrowthByYear(orgMembers.map((m) => m.dateJoined));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Organization Reports</h1>
        <p className="text-sm text-muted-foreground">
          Performance of {organization.name} across savings, loans and membership.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Members" value={String(orgMembers.length)} icon={Users} />
        <StatCard label="Total Savings" value={formatRwf(financial.totalSavings)} icon={PiggyBank} />
        <StatCard
          label="Total Disbursed"
          value={formatRwf(totalDisbursed)}
          icon={HandCoins}
          description="Disbursed, repaying or completed loans"
        />
        <StatCard
          label="Loan Approval Rate"
          value={`${approvalRate}%`}
          icon={TrendingUp}
          description={`${approvedCount} approved of ${decidedCount} decided`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Savings Growth"
          description="Organization-wide balance over the last 8 months"
          className="lg:col-span-2"
        >
          <TrendLineChart
            data={savingsSeries}
            xKey="month"
            series={[{ key: "balance", label: "Total Savings", color: "var(--chart-1)" }]}
            valueFormatter={(v) => `${Math.round(v / 1000000)}M`}
          />
        </ChartCard>
        <ChartCard title="Loan Approval Rate" description="Approved vs rejected applications">
          <DonutChart
            data={[
              { key: "approved", label: "Approved", value: approvedCount, color: "var(--chart-1)" },
              { key: "rejected", label: "Rejected", value: rejectedCount, color: "var(--chart-4)" },
            ]}
            centerValue={`${approvalRate}%`}
            centerLabel="Approved"
          />
        </ChartCard>
      </div>

      <ChartCard title="Membership Growth" description="Cumulative members since founding">
        <TrendLineChart
          data={membershipSeries}
          xKey="year"
          series={[{ key: "members", label: "Members", color: "var(--chart-2)" }]}
        />
      </ChartCard>
    </div>
  );
}
