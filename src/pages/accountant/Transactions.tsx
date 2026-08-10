import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/shared/data-table";
import { useDataStore } from "@/lib/store/data-store";
import { formatDate, formatRwf } from "@/lib/format";
import type { LedgerTransaction } from "@/lib/types";

type LedgerType = LedgerTransaction["type"];
type LedgerMethod = LedgerTransaction["method"];

const TYPE_LABEL: Record<LedgerType, string> = {
  "salary-deduction": "Salary Deduction",
  voluntary: "Voluntary Savings",
  "share-purchase": "Share Purchase",
  "loan-repayment": "Loan Repayment",
  withdrawal: "Withdrawal",
  "loan-disbursement-adjustment": "Loan Disbursement",
  "insurance-fee": "Insurance Fee",
  "interest-income": "Interest Income",
};

const METHOD_LABEL: Record<LedgerMethod, string> = {
  payroll: "Payroll",
  cash: "Cash",
  "mobile-money": "Mobile Money",
  "bank-transfer": "Bank Transfer",
};

export default function AccountantTransactionsPage() {
  const ledgerTransactions = useDataStore((s) => s.ledgerTransactions);
  const members = useDataStore((s) => s.members);
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [methodFilter, setMethodFilter] = React.useState("all");

  const sorted = [...ledgerTransactions].sort((a, b) => (a.date < b.date ? 1 : -1));

  const filtered = sorted.filter((t) => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (methodFilter !== "all" && t.method !== methodFilter) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-sm text-muted-foreground">
          A complete ledger of every recorded transaction across the organization.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-sm font-medium">{filtered.length} transactions</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {(Object.keys(TYPE_LABEL) as LedgerType[]).map((t) => (
                  <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={methodFilter} onValueChange={(v) => setMethodFilter(v ?? "all")}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All methods</SelectItem>
                {(Object.keys(METHOD_LABEL) as LedgerMethod[]).map((m) => (
                  <SelectItem key={m} value={m}>{METHOD_LABEL[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: "Date", cell: (r) => formatDate(r.date) },
              {
                header: "Member",
                cell: (r) => members.find((m) => m.id === r.memberId)?.fullName ?? "—",
              },
              { header: "Type", cell: (r) => <Badge variant="outline">{TYPE_LABEL[r.type]}</Badge> },
              { header: "Method", cell: (r) => METHOD_LABEL[r.method] },
              { header: "Amount", cell: (r) => formatRwf(r.amount) },
              { header: "Reference", cell: (r) => <span className="text-muted-foreground">{r.reference}</span> },
              { header: "Recorded By", cell: (r) => r.recordedBy },
            ]}
            rows={filtered}
            rowKey={(r) => r.id}
            getSearchText={(r) =>
              `${members.find((m) => m.id === r.memberId)?.fullName ?? ""} ${r.reference} ${r.recordedBy}`
            }
            searchPlaceholder="Search by member or reference..."
            emptyMessage="No transactions match these filters."
          />
        </CardContent>
      </Card>
    </div>
  );
}
