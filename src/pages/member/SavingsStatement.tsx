import * as React from "react";
import { Printer, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/shared/data-table";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { useDataStore } from "@/lib/store/data-store";
import { formatDate, formatRwf } from "@/lib/format";
import type { SavingsTxType } from "@/lib/types";

const TYPE_LABEL: Record<SavingsTxType, string> = {
  "salary-deduction": "Salary Deduction",
  voluntary: "Voluntary Savings",
  "share-purchase": "Share Purchase",
  "loan-repayment": "Loan Repayment",
  withdrawal: "Withdrawal",
  "loan-disbursement-adjustment": "Loan Disbursement",
};

export default function SavingsStatementPage() {
  const { user } = useCurrentUser();
  const savingsLedger = useDataStore((s) => s.savingsLedger);
  const [yearFilter, setYearFilter] = React.useState<string>("all");
  const [monthFilter, setMonthFilter] = React.useState<string>("all");

  if (!user) return null;
  const ledger = savingsLedger[user.id] ?? [];

  const years = Array.from(
    new Set(ledger.map((tx) => String(new Date(tx.date).getFullYear())))
  ).sort((a, b) => Number(b) - Number(a));

  const filtered = ledger.filter((tx) => {
    const d = new Date(tx.date);
    if (yearFilter !== "all" && String(d.getFullYear()) !== yearFilter) return false;
    if (monthFilter !== "all" && String(d.getMonth()) !== monthFilter) return false;
    return true;
  });

  const openingBalance = filtered.length
    ? filtered[0].balanceAfter - (filtered[0].type === "loan-repayment" ? 0 : filtered[0].amount)
    : ledger.length
      ? ledger[ledger.length - 1].balanceAfter
      : 0;
  const currentBalance = ledger.length ? ledger[ledger.length - 1].balanceAfter : 0;
  const totalIn = filtered
    .filter((t) => t.type !== "loan-repayment")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="print-hidden flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Savings Statement</h1>
          <p className="text-sm text-muted-foreground">
            A full record of your contributions, similar to a bank statement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={yearFilter} onValueChange={(v) => setYearFilter(v ?? "all")}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All years</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={monthFilter} onValueChange={(v) => setMonthFilter(v ?? "all")}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Month" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All months</SelectItem>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i} value={String(i)}>
                  {new Date(2000, i, 1).toLocaleDateString("en-RW", { month: "long" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-3.5" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Download className="size-3.5" /> Export PDF
          </Button>
        </div>
      </div>

      <div className="print-area flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Card><CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">Opening Balance</CardTitle></CardHeader><CardContent className="text-lg font-semibold">{formatRwf(Math.max(0, openingBalance))}</CardContent></Card>
          <Card><CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">Contributions (Selected Period)</CardTitle></CardHeader><CardContent className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">+{formatRwf(totalIn)}</CardContent></Card>
          <Card><CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">Current Balance</CardTitle></CardHeader><CardContent className="text-lg font-semibold text-primary">{formatRwf(currentBalance)}</CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { header: "Date", cell: (r) => formatDate(r.date) },
                {
                  header: "Type",
                  cell: (r) => <Badge variant="outline">{TYPE_LABEL[r.type]}</Badge>,
                },
                { header: "Description", cell: (r) => r.description },
                { header: "Source", cell: (r) => <span className="text-muted-foreground">{r.source}</span> },
                {
                  header: "Amount",
                  cell: (r) => (
                    <span
                      className={
                        r.type === "loan-repayment"
                          ? "text-muted-foreground"
                          : "font-medium text-emerald-600 dark:text-emerald-400"
                      }
                    >
                      {r.type === "loan-repayment" ? "—" : "+"}
                      {formatRwf(r.amount)}
                    </span>
                  ),
                },
                { header: "Balance", cell: (r) => formatRwf(r.balanceAfter) },
              ]}
              rows={[...filtered].reverse()}
              rowKey={(r) => r.id}
              emptyMessage="No transactions in this period."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
