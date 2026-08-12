import { Users, PiggyBank, HandCoins, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/shared/chart-card";
import { TrendLineChart } from "@/components/charts/trend-line-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { useDataStore } from "@/lib/store/data-store";
import { formatRwf } from "@/lib/format";
import { MOCK_TODAY } from "@/lib/mock-data";
import type { SavingsTransaction } from "@/lib/types";

function orgSavingsSeries(
  memberIds: string[],
  savingsLedger: Record<string, SavingsTransaction[]>,
  months = 8
) {
  const today = new Date(MOCK_TODAY);
  const series: { month: string; balance: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const cutoff = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    const label = monthStart.toLocaleDateString("en-RW", { month: "short", year: "2-digit" });
    let total = 0;
    for (const id of memberIds) {
      const ledger = savingsLedger[id] ?? [];
      let balance = 0;
      for (const tx of ledger) {
        if (new Date(tx.date) <= cutoff) balance = tx.balanceAfter;
        else break;
      }
      total += balance;
    }
    series.push({ month: label, balance: total });
  }
  return series;
}

function membershipGrowthByYear(dateJoinedList: string[]) {
  if (dateJoinedList.length === 0) return [];
  const years = dateJoinedList.map((d) => new Date(d).getFullYear());
  const minYear = Math.min(...years);
  const maxYear = new Date(MOCK_TODAY).getFullYear();
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
  const organization = useDataStore((s) => s.organization);
  const members = useDataStore((s) => s.members);
  const savingsLedger = useDataStore((s) => s.savingsLedger);
  const loans = useDataStore((s) => s.loans);

  const orgMembers = members.filter((m) => m.organizationId === organization.id);
  const memberIds = orgMembers.map((m) => m.id);

  const totalSavings = memberIds.reduce((sum, id) => {
    const ledger = savingsLedger[id] ?? [];
    return sum + (ledger.length ? ledger[ledger.length - 1].balanceAfter : 0);
  }, 0);

  const orgLoans = loans.filter((l) => memberIds.includes(l.memberId));
  const approvedCount = orgLoans.filter((l) => DECIDED_APPROVED.includes(l.status)).length;
  const rejectedCount = orgLoans.filter((l) => l.status === "rejected").length;
  const decidedCount = approvedCount + rejectedCount;
  const approvalRate = decidedCount > 0 ? Math.round((approvedCount / decidedCount) * 100) : 0;
  const totalDisbursed = orgLoans
    .filter((l) => ["disbursed", "repaying", "completed"].includes(l.status))
    .reduce((sum, l) => sum + l.amount, 0);

  const savingsSeries = orgSavingsSeries(memberIds, savingsLedger, 8);
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
        <StatCard label="Total Savings" value={formatRwf(totalSavings)} icon={PiggyBank} />
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
