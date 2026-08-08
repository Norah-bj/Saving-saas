"use client";

import * as React from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, Download, CheckCircle2, XCircle, Copy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { useDataStore } from "@/lib/store/data-store";
import { formatDate, formatRwf } from "@/lib/format";
import type { PayrollImportRecord } from "@/lib/types";

interface RawRow {
  employeeId: string;
  amount: number;
}

function pick(row: Record<string, unknown>, keys: string[]) {
  const normalized = Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), v])
  );
  for (const key of keys) {
    if (normalized[key] !== undefined) return normalized[key];
  }
  return undefined;
}

export default function ExcelImportPage() {
  const { user } = useCurrentUser();
  const members = useDataStore((s) => s.members);
  const importPayroll = useDataStore((s) => s.importPayroll);
  const payrollImports = useDataStore((s) => s.payrollImports);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [rawRows, setRawRows] = React.useState<RawRow[]>([]);
  const [result, setResult] = React.useState<{
    summary: ReturnType<typeof importPayroll>["summary"];
    rows: PayrollImportRecord[];
  } | null>(null);
  const [parseError, setParseError] = React.useState<string | null>(null);

  function handleFile(file: File) {
    setResult(null);
    setParseError(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
        const parsed: RawRow[] = json.map((row) => ({
          employeeId: String(pick(row, ["employee id", "employeeid"]) ?? "").trim(),
          amount: Number(pick(row, ["saving amount", "amount"]) ?? 0),
        }));
        if (parsed.length === 0) {
          setParseError("No rows found. Make sure the sheet has an 'Employee ID' and 'Saving Amount' column.");
        }
        setRawRows(parsed);
      } catch {
        setParseError("Couldn't read this file. Please upload a valid .xlsx file.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function downloadTemplate() {
    const sample = members
      .filter((m) => m.organizationId === user?.organizationId)
      .slice(0, 8)
      .map((m) => ({
        "Employee ID": m.employeeId,
        Name: m.fullName,
        "Saving Amount": Math.round(m.monthlySalary * 0.1),
      }));
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payroll Savings");
    XLSX.writeFile(wb, "payroll_savings_template.xlsx");
  }

  function runImport() {
    if (!rawRows.length || !user) return;
    const outcome = importPayroll(rawRows, fileName ?? "payroll_import.xlsx", user.fullName);
    setResult(outcome);
    setRawRows([]);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Excel Payroll Import</h1>
          <p className="text-sm text-muted-foreground">
            Upload the monthly payroll savings file. Rows are validated against Employee IDs
            before member statements are updated.
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
            className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center transition-colors hover:border-primary/50 hover:bg-accent/30"
          >
            <Upload className="size-6 text-muted-foreground" />
            <span className="text-sm font-medium">Click to select an .xlsx file</span>
            <span className="text-xs text-muted-foreground">or drag and drop</span>
          </button>
          {parseError && <p className="mt-3 text-sm text-destructive">{parseError}</p>}
        </CardContent>
      </Card>

      {rawRows.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium">Preview — {fileName}</CardTitle>
              <CardDescription>{rawRows.length} rows detected. Review before importing.</CardDescription>
            </div>
            <Button onClick={runImport}>
              <FileSpreadsheet className="size-4" /> Import {rawRows.length} rows
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { header: "Employee ID", cell: (r) => r.employeeId || <span className="text-destructive">Missing</span> },
                {
                  header: "Matched Member",
                  cell: (r) => {
                    const m = members.find((mm) => mm.employeeId === r.employeeId);
                    return m ? m.fullName : <span className="text-destructive">Not found</span>;
                  },
                },
                {
                  header: "Amount",
                  cell: (r) => (r.amount > 0 ? formatRwf(r.amount) : <span className="text-destructive">Invalid</span>),
                },
              ]}
              rows={rawRows}
              rowKey={(r, i = 0) => `${r.employeeId}-${i}`}
            />
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Import Summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryTile label="Uploaded Records" value={result.summary.totalRecords} />
              <SummaryTile label="Successful" value={result.summary.successful} tone="success" />
              <SummaryTile label="Failed" value={result.summary.failed} tone="destructive" />
              <SummaryTile label="Duplicates" value={result.summary.duplicates} tone="warning" />
            </div>
            <p className="text-sm text-muted-foreground">
              Total imported: <span className="font-medium text-foreground">{formatRwf(result.summary.totalAmount)}</span>
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
              rows={result.rows}
              rowKey={(r, i = 0) => `${r.employeeId}-${i}`}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Import History</CardTitle>
        </CardHeader>
        <CardContent>
          {payrollImports.length === 0 ? (
            <EmptyState icon={FileSpreadsheet} title="No imports yet" />
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
