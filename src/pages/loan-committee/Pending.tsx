import { useNavigate } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { LoanStatusBadge } from "@/components/shared/status-badge";
import { useDataStore } from "@/lib/store/data-store";
import { formatDate, formatRwf } from "@/lib/format";
import type { LoanStatus } from "@/lib/types";

const REVIEWABLE: LoanStatus[] = [
  "submitted",
  "under-review",
  "guarantor-approval",
  "committee-review",
];

export default function PendingApplicationsPage() {
  const navigate = useNavigate();
  const loans = useDataStore((s) => s.loans);
  const members = useDataStore((s) => s.members);

  const pending = loans
    .filter((l) => REVIEWABLE.includes(l.status))
    .sort((a, b) => (a.appliedDate < b.appliedDate ? 1 : -1));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Pending Applications</h1>
        <p className="text-sm text-muted-foreground">
          Loan applications awaiting review, guarantor response, or committee decision.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{pending.length} pending</CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No pending applications" description="All caught up." />
          ) : (
            <DataTable
              rows={pending}
              rowKey={(r) => r.id}
              onRowClick={(r) => navigate(`/loan-committee/pending/${r.id}`)}
              getSearchText={(r) =>
                `${r.contractNumber} ${members.find((m) => m.id === r.memberId)?.fullName ?? ""} ${r.purpose}`
              }
              searchPlaceholder="Search by member or contract number..."
              columns={[
                { header: "Contract #", cell: (r) => r.contractNumber },
                {
                  header: "Member",
                  cell: (r) => members.find((m) => m.id === r.memberId)?.fullName ?? "—",
                },
                { header: "Amount", cell: (r) => formatRwf(r.amount) },
                { header: "Applied", cell: (r) => formatDate(r.appliedDate) },
                { header: "Risk", cell: (r) => `${r.riskScore}/100` },
                { header: "Status", cell: (r) => <LoanStatusBadge status={r.status} /> },
              ]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
