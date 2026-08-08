"use client";

import { Users, PiggyBank, HandCoins, Landmark, ScrollText } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/shared/chart-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendLineChart } from "@/components/charts/trend-line-chart";
import { useDataStore } from "@/lib/store/data-store";
import { formatDate, formatRwf } from "@/lib/format";
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

export default function OrgAdminDashboardPage() {
  const organization = useDataStore((s) => s.organization);
  const members = useDataStore((s) => s.members);
  const savingsLedger = useDataStore((s) => s.savingsLedger);
  const shareHoldings = useDataStore((s) => s.shareHoldings);
  const loans = useDataStore((s) => s.loans);
  const auditLogs = useDataStore((s) => s.auditLogs);

  const orgMembers = members.filter((m) => m.organizationId === organization.id);
  const memberIds = orgMembers.map((m) => m.id);

  const totalSavings = memberIds.reduce((sum, id) => {
    const ledger = savingsLedger[id] ?? [];
    return sum + (ledger.length ? ledger[ledger.length - 1].balanceAfter : 0);
  }, 0);

  const activeLoans = loans.filter(
    (l) => memberIds.includes(l.memberId) && (l.status === "disbursed" || l.status === "repaying")
  ).length;

  const totalSharesValue = memberIds.reduce((sum, id) => {
    const holding = shareHoldings[id];
    return sum + (holding ? holding.totalShares * holding.shareValue : 0);
  }, 0);

  const savingsSeries = orgSavingsSeries(memberIds, savingsLedger, 8);
  const membershipSeries = membershipGrowthByYear(orgMembers.map((m) => m.dateJoined));

  const recentActivity = auditLogs
    .filter((a) => a.organizationId === organization.id)
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Organization Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of {organization.name} across membership, savings, loans and shares.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Members"
          value={String(orgMembers.length)}
          icon={Users}
          description="Registered cooperative members"
        />
        <StatCard
          label="Total Savings"
          value={formatRwf(totalSavings)}
          icon={PiggyBank}
          description="Aggregate member balances"
        />
        <StatCard
          label="Active Loans"
          value={String(activeLoans)}
          icon={HandCoins}
          description="Disbursed or repaying"
        />
        <StatCard
          label="Total Shares Value"
          value={formatRwf(totalSharesValue)}
          icon={Landmark}
          description="Across all members"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Savings Growth" description="Organization-wide savings balance over the last 8 months">
          <TrendLineChart
            data={savingsSeries}
            xKey="month"
            series={[{ key: "balance", label: "Total Savings", color: "var(--chart-1)" }]}
            valueFormatter={(v) => `${Math.round(v / 1000000)}M`}
          />
        </ChartCard>
        <ChartCard title="Membership Growth" description="Cumulative members since founding">
          <TrendLineChart
            data={membershipSeries}
            xKey="year"
            series={[{ key: "members", label: "Members", color: "var(--chart-2)" }]}
          />
        </ChartCard>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
          <ScrollText className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {recentActivity.length === 0 && (
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          )}
          {recentActivity.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{a.action}</p>
                <p className="text-xs text-muted-foreground">
                  {a.actor} · {a.target}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{formatDate(a.date)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
