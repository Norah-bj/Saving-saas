import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  PiggyBank,
  Landmark,
  HandCoins,
  CalendarClock,
  ArrowRight,
  CalendarDays,
  Megaphone,
} from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/shared/chart-card";
import { DataTable } from "@/components/shared/data-table";
import { LoanStatusBadge } from "@/components/shared/status-badge";
import { TrendLineChart } from "@/components/charts/trend-line-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { useDataStore } from "@/lib/store/data-store";
import { formatDate, formatRwf } from "@/lib/format";
import { monthlySeriesFromLedger } from "@/lib/chart-utils";

const PERIOD_MONTHS: Record<string, number> = { "3M": 3, "6M": 6, "1Y": 12, All: 48 };

export default function MemberDashboardPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = React.useState("6M");
  const { user } = useCurrentUser();
  const savingsLedger = useDataStore((s) => s.savingsLedger);
  const shareHoldings = useDataStore((s) => s.shareHoldings);
  const loans = useDataStore((s) => s.loans);
  const meetings = useDataStore((s) => s.meetings);
  const announcements = useDataStore((s) => s.announcements);

  if (!user) return null;

  const ledger = savingsLedger[user.id] ?? [];
  const balance = ledger.length ? ledger[ledger.length - 1].balanceAfter : 0;
  const shares = shareHoldings[user.id] ?? { totalShares: 0, shareValue: 5000 };
  const shareValue = shares.totalShares * shares.shareValue;
  const myLoans = loans.filter((l) => l.memberId === user.id);
  const activeLoan = myLoans.find((l) =>
    ["disbursed", "repaying"].includes(l.status)
  );
  const nextDeduction = Math.round(user.monthlySalary * 0.1);

  const series = monthlySeriesFromLedger(ledger, PERIOD_MONTHS[period]);
  const sparklineSeries = monthlySeriesFromLedger(ledger, 8).map((s) => s.balance);
  const savingsTrend =
    sparklineSeries.length > 1 && sparklineSeries[0] > 0
      ? Math.round(
          ((sparklineSeries[sparklineSeries.length - 1] - sparklineSeries[0]) /
            sparklineSeries[0]) *
            100
        )
      : 0;
  const recentTx = [...ledger].slice(-5).reverse();
  const upcomingMeetings = meetings
    .filter((m) => m.status === "upcoming")
    .slice(0, 2);
  const latestAnnouncements = announcements.slice(0, 3);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">
          Welcome back, {user.fullName.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s an overview of your savings, shares and loans.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Savings"
          value={formatRwf(balance)}
          icon={PiggyBank}
          sparkline={sparklineSeries}
          trend={
            savingsTrend !== 0
              ? { value: `${savingsTrend > 0 ? "+" : ""}${savingsTrend}%`, direction: savingsTrend > 0 ? "up" : "down", label: "last 8 months" }
              : undefined
          }
          description="All-time balance"
        />
        <StatCard
          label="Total Shares"
          value={`${shares.totalShares} shares`}
          icon={Landmark}
          description={formatRwf(shareValue)}
        />
        <StatCard
          label="Active Loan"
          value={activeLoan ? formatRwf(activeLoan.remainingBalance) : "None"}
          icon={HandCoins}
          description={activeLoan ? "Remaining balance" : "No active loan"}
        />
        <StatCard
          label="Next Salary Deduction"
          value={formatRwf(nextDeduction)}
          icon={CalendarClock}
          description="Estimated for next payroll cycle"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Savings Growth"
          description="Balance over time"
          className="lg:col-span-2"
          periodOptions={["3M", "6M", "1Y", "All"]}
          period={period}
          onPeriodChange={setPeriod}
        >
          <TrendLineChart
            data={series}
            xKey="month"
            series={[{ key: "balance", label: "Savings Balance", color: "var(--chart-1)" }]}
            valueFormatter={(v) => `${Math.round(v / 1000)}k`}
          />
        </ChartCard>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Upcoming Meetings</CardTitle>
            <CalendarDays className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {upcomingMeetings.length === 0 && (
              <p className="text-sm text-muted-foreground">No upcoming meetings.</p>
            )}
            {upcomingMeetings.map((m) => (
              <div key={m.id} className="rounded-lg border p-3">
                <p className="text-sm font-medium">{m.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(m.date)} at {m.time} — {m.location}
                </p>
              </div>
            ))}
            <Button variant="outline" size="sm" render={<Link to="/member/meetings" />}>
              View all meetings
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Recent Transactions</CardTitle>
            <Button variant="ghost" size="sm" render={<Link to="/member/savings/statement" />}>
              Full statement <ArrowRight className="size-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { header: "Date", cell: (r) => formatDate(r.date) },
                { header: "Description", cell: (r) => r.description },
                {
                  header: "Amount",
                  cell: (r) => (
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      +{formatRwf(r.amount)}
                    </span>
                  ),
                },
                { header: "Balance", cell: (r) => formatRwf(r.balanceAfter) },
              ]}
              rows={recentTx}
              rowKey={(r) => r.id}
              emptyMessage="No transactions yet."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Latest Announcements</CardTitle>
            <Megaphone className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {latestAnnouncements.map((a) => (
              <div key={a.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{a.title}</p>
                  {a.priority !== "normal" && (
                    <Badge variant="outline" className="shrink-0 capitalize">
                      {a.priority}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.body}</p>
              </div>
            ))}
            <Button variant="outline" size="sm" render={<Link to="/member/announcements" />}>
              View all announcements
            </Button>
          </CardContent>
        </Card>
      </div>

      {myLoans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">My Loans</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { header: "Contract #", cell: (r) => r.contractNumber },
                { header: "Purpose", cell: (r) => r.purpose },
                { header: "Amount", cell: (r) => formatRwf(r.amount) },
                { header: "Status", cell: (r) => <LoanStatusBadge status={r.status} /> },
              ]}
              rows={myLoans}
              rowKey={(r) => r.id}
              onRowClick={(r) => navigate(`/member/loans/${r.id}`)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
