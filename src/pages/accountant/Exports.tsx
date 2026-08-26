import * as XLSX from "xlsx";
import { Users, HandCoins, Receipt, FileSpreadsheet, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMembers } from "@/lib/api/members";
import { useLoans } from "@/lib/api/loans";
import { useLedger } from "@/lib/api/ledger";
import { usePayrollImports } from "@/lib/api/payroll";
import { formatDate, formatRwf } from "@/lib/format";
import { LOAN_STATUS_LABEL } from "@/lib/types";

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
}

function exportSheet(rows: Record<string, unknown>[], sheetName: string, fileName: string) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}

export default function AccountantExportsPage() {
  const { data: orgMembers = [] } = useMembers();
  const { data: loans = [] } = useLoans();
  const { data: ledgerTransactions = [] } = useLedger();
  const { data: payrollImports = [] } = usePayrollImports();

  const currentMonthKey = monthKey(new Date().toISOString());

  function exportMemberBalances() {
    const rows = orgMembers.map((m) => ({
      "Employee ID": m.employeeId,
      Name: m.fullName,
      Department: m.department,
      Status: m.status,
      "Savings Balance (RWF)": m.savingsBalanceRwf,
    }));
    exportSheet(rows, "Savings Balances", "member_savings_balances.xlsx");
  }

  function exportAllLoans() {
    const rows = loans.map((l) => ({
      "Contract #": l.contractNumber,
      Member: orgMembers.find((m) => m.id === l.memberId)?.fullName ?? "—",
      "Amount (RWF)": l.amount,
      Purpose: l.purpose,
      Status: LOAN_STATUS_LABEL[l.status],
      "Remaining Balance (RWF)": l.remainingBalance,
      "Applied Date": l.appliedDate,
      "Risk Score": l.riskScore,
    }));
    exportSheet(rows, "All Loans", "all_loans.xlsx");
  }

  function exportThisMonthTransactions() {
    const rows = ledgerTransactions
      .filter((t) => monthKey(t.date) === currentMonthKey)
      .map((t) => ({
        Date: t.date,
        Member: orgMembers.find((m) => m.id === t.memberId)?.fullName ?? "—",
        Type: t.type,
        "Amount (RWF)": t.amount,
        Method: t.method,
        Reference: t.reference,
        "Recorded By": t.recordedBy,
      }));
    exportSheet(rows, "This Month Transactions", "this_months_transactions.xlsx");
  }

  function exportPayrollHistory() {
    const rows = payrollImports.map((p) => ({
      File: p.fileName,
      Date: p.date,
      "Imported By": p.importedBy,
      "Total Records": p.totalRecords,
      Successful: p.successful,
      Failed: p.failed,
      Duplicates: p.duplicates,
      "Total Amount (RWF)": p.totalAmount,
    }));
    exportSheet(rows, "Payroll Imports", "payroll_import_history.xlsx");
  }

  const reports: {
    icon: typeof Users;
    title: string;
    description: string;
    count: string;
    onExport: () => void;
  }[] = [
    {
      icon: Users,
      title: "All Members — Savings Balances",
      description: "Every member's current savings balance, department, and status.",
      count: `${orgMembers.length} members`,
      onExport: exportMemberBalances,
    },
    {
      icon: HandCoins,
      title: "All Loans",
      description: "Every loan on record with amount, status, and remaining balance.",
      count: `${loans.length} loans`,
      onExport: exportAllLoans,
    },
    {
      icon: Receipt,
      title: "This Month's Transactions",
      description: `All ledger transactions recorded in ${new Date().toLocaleDateString("en-RW", { month: "long", year: "numeric" })}.`,
      count: `${ledgerTransactions.filter((t) => monthKey(t.date) === currentMonthKey).length} transactions`,
      onExport: exportThisMonthTransactions,
    },
    {
      icon: FileSpreadsheet,
      title: "Payroll Import History",
      description: "Every payroll savings import batch and its outcome.",
      count: `${payrollImports.length} imports`,
      onExport: exportPayrollHistory,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Exports</h1>
        <p className="text-sm text-muted-foreground">
          Download financial data as Excel workbooks for offline reporting.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {reports.map((r) => (
          <Card key={r.title}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <r.icon className="size-4" />
                </div>
                <span className="text-xs text-muted-foreground">{r.count}</span>
              </div>
              <CardTitle className="text-sm font-medium">{r.title}</CardTitle>
              <CardDescription>{r.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="sm" onClick={r.onExport}>
                <Download className="size-3.5" /> Export to Excel
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
