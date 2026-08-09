import { useNavigate } from "react-router-dom";
import { Gavel } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { LoanStatusBadge } from "@/components/shared/status-badge";
import { useDataStore } from "@/lib/store/data-store";
import { formatDate, formatRwf } from "@/lib/format";
import type { Loan, LoanStatus } from "@/lib/types";

const DECIDED_STATUSES: LoanStatus[] = [
  "approved",
  "contract-generated",
  "disbursed",
  "repaying",
  "completed",
  "rejected",
];

function decisionDate(loan: Loan) {
  if (loan.status === "rejected") {
    return (
      [...loan.timeline].reverse().find((t) => t.stage === "rejected")?.date ?? loan.appliedDate
    );
  }
  return loan.approvedDate ?? loan.appliedDate;
}

export default function LoanCommitteeDecisionsPage() {
  const navigate = useNavigate();
  const loans = useDataStore((s) => s.loans);
  const members = useDataStore((s) => s.members);

  const decided = loans
    .filter((l) => DECIDED_STATUSES.includes(l.status))
    .sort((a, b) => (decisionDate(a) < decisionDate(b) ? 1 : -1));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Approvals &amp; Rejections</h1>
        <p className="text-sm text-muted-foreground">
          Full history of loans the committee has already decided on.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{decided.length} decided applications</CardTitle>
        </CardHeader>
        <CardContent>
          {decided.length === 0 ? (
            <EmptyState icon={Gavel} title="No decisions recorded yet" />
          ) : (
            <DataTable
              rows={decided}
              rowKey={(r) => r.id}
              onRowClick={(r) => navigate(`/loan-committee/pending/${r.id}`)}
              columns={[
                { header: "Contract #", cell: (r) => r.contractNumber },
                {
                  header: "Member",
                  cell: (r) => members.find((m) => m.id === r.memberId)?.fullName ?? "—",
                },
                { header: "Amount", cell: (r) => formatRwf(r.amount) },
                { header: "Decision Date", cell: (r) => formatDate(decisionDate(r)) },
                { header: "Status", cell: (r) => <LoanStatusBadge status={r.status} /> },
                { header: "Risk Score", cell: (r) => `${r.riskScore}/100` },
              ]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
