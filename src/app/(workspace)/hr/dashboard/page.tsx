"use client";

import Link from "next/link";
import { Wallet, Users, CalendarClock, TrendingDown } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/shared/chart-card";
import { BarComparisonChart } from "@/components/charts/bar-comparison-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/data-table";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { useDataStore } from "@/lib/store/data-store";
import { formatDate, formatRwf } from "@/lib/format";

export default function HrDashboardPage() {
  const { user } = useCurrentUser();
  const members = useDataStore((s) => s.members);
  const payrollImports = useDataStore((s) => s.payrollImports);

  if (!user) return null;

  const orgMembers = members.filter((m) => m.organizationId === user.organizationId);
  const totalPayroll = orgMembers.reduce((sum, m) => sum + m.monthlySalary, 0);
  const sortedImports = [...payrollImports].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const lastImport = sortedImports[0];

  const chartData = [...sortedImports]
    .reverse()
    .map((imp) => ({
      month: new Date(imp.date).toLocaleDateString("en-RW", { month: "short", year: "2-digit" }),
      totalAmount: imp.totalAmount,
    }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">HR Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Payroll savings deduction overview for {orgMembers.length} covered members.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Monthly Payroll"
          value={formatRwf(totalPayroll)}
          icon={Wallet}
          description="Sum of member salaries"
        />
        <StatCard
          label="Members Covered"
          value={String(orgMembers.length)}
          icon={Users}
          description="Active on payroll"
        />
        <StatCard
          label="Last Upload"
          value={lastImport ? formatDate(lastImport.date) : "None yet"}
          icon={CalendarClock}
          description={lastImport ? lastImport.fileName : "No imports recorded"}
        />
        <StatCard
          label="Total Deducted Last Month"
          value={lastImport ? formatRwf(lastImport.totalAmount) : formatRwf(0)}
          icon={TrendingDown}
          description={lastImport ? `${lastImport.successful} of ${lastImport.totalRecords} records` : "—"}
        />
      </div>

      <ChartCard title="Monthly Deduction Totals" description="Total salary savings deducted per payroll import">
        <BarComparisonChart
          data={chartData}
          xKey="month"
          series={[{ key: "totalAmount", label: "Total Deducted", color: "var(--chart-1)" }]}
          valueFormatter={(v) => `${Math.round(v / 1000)}k`}
        />
      </ChartCard>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Recent Payroll Imports</CardTitle>
          <Button variant="outline" size="sm" render={<Link href="/hr/reports" />}>
            View full history
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: "File", cell: (r) => r.fileName },
              { header: "Date", cell: (r) => formatDate(r.date) },
              { header: "Records", cell: (r) => r.totalRecords },
              { header: "Successful", cell: (r) => r.successful },
              { header: "Total Amount", cell: (r) => formatRwf(r.totalAmount) },
            ]}
            rows={sortedImports.slice(0, 5)}
            rowKey={(r) => r.id}
            emptyMessage="No payroll imports yet."
          />
        </CardContent>
      </Card>
    </div>
  );
}
