import * as React from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, Download, CheckCircle2, XCircle, Copy, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { useMembers } from "@/lib/api/members";
import { useImportPayroll, usePayrollImports } from "@/lib/api/payroll";
import { ApiError } from "@/lib/api/client";
import { formatDate, formatRwf } from "@/lib/format";

export default function HrDeductionUploadPage() {
  const { data: members = [] } = useMembers();
  const importPayroll = useImportPayroll();
  const { data: payrollImports = [] } = usePayrollImports();

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);

  function handleFile(file: File) {
    setFileName(file.name);
    importPayroll.mutate(file);
  }

  function downloadTemplate() {
    const sample = members.slice(0, 8).map((m) => ({
      "Employee ID": m.employeeId,
      Name: m.fullName,
      "Saving Amount": Math.round(m.monthlySalaryRwf * 0.1),
    }));
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payroll Savings");
    XLSX.writeFile(wb, "payroll_savings_template.xlsx");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Salary Deduction Upload</h1>
          <p className="text-sm text-muted-foreground">
            Upload the monthly payroll office export. Rows are validated against Employee IDs
            before member savings statements are updated.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="size-3.5" /> Download sample template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Upload File</CardTitle>
          <CardDescription>
            Expected columns: <code>Employee ID</code>, <code>Name</code>, <code>Saving Amount</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importPayroll.isPending}
            className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center transition-colors hover:border-primary/50 hover:bg-accent/30 disabled:opacity-60"
          >
            {importPayroll.isPending ? (
              <>
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
                <span className="text-sm font-medium">Uploading {fileName}…</span>
              </>
            ) : (
              <>
                <Upload className="size-6 text-muted-foreground" />
                <span className="text-sm font-medium">Click to select an .xlsx file</span>
                <span className="text-xs text-muted-foreground">or drag and drop</span>
              </>
            )}
          </button>
          {importPayroll.isError && (
            <p className="mt-3 text-sm text-destructive">
              {importPayroll.error instanceof ApiError
                ? importPayroll.error.message
                : "Couldn't import this file. Please try again."}
            </p>
          )}
        </CardContent>
      </Card>

      {importPayroll.isSuccess && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Import Summary — {fileName}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryTile label="Uploaded Records" value={importPayroll.data.summary.totalRecords} />
              <SummaryTile label="Successful" value={importPayroll.data.summary.successful} tone="success" />
              <SummaryTile label="Failed" value={importPayroll.data.summary.failed} tone="destructive" />
              <SummaryTile label="Duplicates" value={importPayroll.data.summary.duplicates} tone="warning" />
            </div>
            <p className="text-sm text-muted-foreground">
              Total imported:{" "}
              <span className="font-medium text-foreground">{formatRwf(importPayroll.data.summary.totalAmount)}</span>
            </p>
            <DataTable
              columns={[
                { header: "Employee ID", cell: (r) => r.employeeId },
                { header: "Name", cell: (r) => r.name },
                { header: "Amount", cell: (r) => formatRwf(r.amount) },
                {
                  header: "Status",
                  cell: (r) => {
                    if (r.status === "matched")
                      return (
                        <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400">
                          <CheckCircle2 className="size-3" /> Imported
                        </Badge>
                      );
                    if (r.status === "duplicate")
                      return (
                        <Badge variant="outline" className="gap-1 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400">
                          <Copy className="size-3" /> Duplicate
                        </Badge>
                      );
                    return (
                      <Badge variant="outline" className="gap-1 border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
                        <XCircle className="size-3" /> {r.errorReason}
                      </Badge>
                    );
                  },
                },
              ]}
              rows={importPayroll.data.rows}
              rowKey={(r, i = 0) => `${r.employeeId}-${i}`}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Upload History</CardTitle>
        </CardHeader>
        <CardContent>
          {payrollImports.length === 0 ? (
            <EmptyState icon={FileSpreadsheet} title="No uploads yet" />
          ) : (
            <DataTable
              columns={[
                { header: "File", cell: (r) => r.fileName },
                { header: "Date", cell: (r) => formatDate(r.date) },
                { header: "By", cell: (r) => r.importedBy },
                { header: "Records", cell: (r) => r.totalRecords },
                { header: "Successful", cell: (r) => r.successful },
                { header: "Failed", cell: (r) => r.failed },
                { header: "Total Amount", cell: (r) => formatRwf(r.totalAmount) },
              ]}
              rows={payrollImports}
              rowKey={(r) => r.id}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "destructive" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "destructive"
        ? "text-destructive"
        : tone === "warning"
          ? "text-amber-600 dark:text-amber-400"
          : "text-foreground";
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
