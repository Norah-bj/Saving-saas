import { Users, PiggyBank, HandCoins, Landmark, ScrollText } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/shared/chart-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendLineChart } from "@/components/charts/trend-line-chart";
import { useOrganization } from "@/lib/api/organization";
import { useMembers } from "@/lib/api/members";
import { useLoans } from "@/lib/api/loans";
import { useAccountantDashboard } from "@/lib/api/reporting";
import { useOrgAuditLog } from "@/lib/api/audit";
import { formatDate, formatRwf } from "@/lib/format";

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

export default function OrgAdminDashboardPage() {
  const { data: organization } = useOrganization();
  const { data: orgMembers = [] } = useMembers();
  const { data: loans = [] } = useLoans();
  const { data: dashboard } = useAccountantDashboard();
  const { data: recentActivity = [] } = useOrgAuditLog();

  if (!organization || !dashboard) return null;

  const activeLoans = loans.filter((l) => l.status === "disbursed" || l.status === "repaying").length;

  const savingsSeries = dashboard.savingsGrowth.map((p) => ({ month: p.month, balance: p.value }));
  const membershipSeries = membershipGrowthByYear(orgMembers.map((m) => m.dateJoined));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Organization Dashboard</h1>
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
          value={formatRwf(dashboard.totalOrgSavings)}
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
          value={formatRwf(dashboard.totalSharesValueRwf)}
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
          {recentActivity.slice(0, 5).map((a) => (
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
