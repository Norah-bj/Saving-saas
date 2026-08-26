import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartCard } from "@/components/shared/chart-card";
import { TrendLineChart } from "@/components/charts/trend-line-chart";
import { DataTable } from "@/components/shared/data-table";
import { useMembers } from "@/lib/api/members";
import { usePayrollImports } from "@/lib/api/payroll";
import { formatDate, formatRwf } from "@/lib/format";

export default function HrPayrollReportsPage() {
  const { data: orgMembers = [] } = useMembers();
  const { data: payrollImports = [] } = usePayrollImports();

  const sortedImports = [...payrollImports].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const trendData = [...sortedImports]
    .reverse()
    .map((imp) => ({
      month: new Date(imp.date).toLocaleDateString("en-RW", { month: "short", year: "2-digit" }),
      totalAmount: imp.totalAmount,
    }));

  const deductionRows = [...orgMembers]
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
    .map((m) => ({
      ...m,
      expectedDeduction: Math.round(m.monthlySalaryRwf * 0.1),
    }));

  const totalExpected = deductionRows.reduce((sum, m) => sum + m.expectedDeduction, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Payroll Reports</h1>
        <p className="text-sm text-muted-foreground">
          Historical deduction totals and the current expected monthly deduction per member.
        </p>
      </div>

      <ChartCard title="Total Deducted per Month" description="From all recorded payroll imports">
        <TrendLineChart
          data={trendData}
          xKey="month"
          series={[{ key: "totalAmount", label: "Total Deducted", color: "var(--chart-1)" }]}
          valueFormatter={(v) => `${Math.round(v / 1000)}k`}
        />
      </ChartCard>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Import History ({sortedImports.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: "File", cell: (r) => r.fileName },
              { header: "Date", cell: (r) => formatDate(r.date) },
              { header: "By", cell: (r) => r.importedBy },
              { header: "Records", cell: (r) => r.totalRecords },
              { header: "Successful", cell: (r) => r.successful },
              { header: "Failed", cell: (r) => r.failed },
              { header: "Duplicates", cell: (r) => r.duplicates },
              { header: "Total Amount", cell: (r) => formatRwf(r.totalAmount) },
            ]}
            rows={sortedImports}
            rowKey={(r) => r.id}
            emptyMessage="No payroll imports recorded yet."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Current Expected Monthly Deduction — {formatRwf(totalExpected)} total
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: "Member", cell: (r) => r.fullName },
              { header: "Employee ID", cell: (r) => r.employeeId },
              { header: "Department", cell: (r) => r.department },
              { header: "Monthly Salary", cell: (r) => formatRwf(r.monthlySalaryRwf) },
              {
                header: "Expected Deduction (10%)",
                cell: (r) => <span className="font-medium">{formatRwf(r.expectedDeduction)}</span>,
              },
            ]}
            rows={deductionRows}
            rowKey={(r) => r.id}
            emptyMessage="No members on payroll."
          />
        </CardContent>
      </Card>
    </div>
  );
}
