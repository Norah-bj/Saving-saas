import * as React from "react";
import { FileText } from "lucide-react";
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
import { EmptyState } from "@/components/shared/empty-state";
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

export default function AccountantStatementsPage() {
  const organization = useDataStore((s) => s.organization);
  const members = useDataStore((s) => s.members);
  const savingsLedger = useDataStore((s) => s.savingsLedger);
  const [memberId, setMemberId] = React.useState<string | null>(null);

  const orgMembers = members
    .filter((m) => m.organizationId === organization.id)
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const ledger = memberId ? savingsLedger[memberId] ?? [] : [];
  const member = orgMembers.find((m) => m.id === memberId);

  const openingBalance = ledger.length
    ? ledger[0].balanceAfter - (ledger[0].type === "loan-repayment" ? 0 : ledger[0].amount)
    : 0;
  const currentBalance = ledger.length ? ledger[ledger.length - 1].balanceAfter : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Member Statements</h1>
        <p className="text-sm text-muted-foreground">
          Look up any member&apos;s savings statement.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Select a Member</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={memberId ?? undefined} onValueChange={(v) => setMemberId(v)}>
            <SelectTrigger className="w-72"><SelectValue placeholder="Choose a member" /></SelectTrigger>
            <SelectContent>
              {orgMembers.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.fullName} — {m.employeeId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {!member ? (
        <EmptyState
          icon={FileText}
          title="No member selected"
          description="Pick a member above to view their savings statement."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">Member</CardTitle></CardHeader>
              <CardContent className="text-lg font-semibold">{member.fullName}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">Opening Balance</CardTitle></CardHeader>
              <CardContent className="text-lg font-semibold">{formatRwf(Math.max(0, openingBalance))}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">Current Balance</CardTitle></CardHeader>
              <CardContent className="text-lg font-semibold text-primary">{formatRwf(currentBalance)}</CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { header: "Date", cell: (r) => formatDate(r.date) },
                  { header: "Type", cell: (r) => <Badge variant="outline">{TYPE_LABEL[r.type]}</Badge> },
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
                rows={[...ledger].reverse()}
                rowKey={(r) => r.id}
                emptyMessage="No transactions recorded for this member."
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
