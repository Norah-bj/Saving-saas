import * as React from "react";
import { Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { RequestStatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useShareWithdrawalRequests, useDecideShareWithdrawal } from "@/lib/api/membership";
import { useMembers, type MemberSummaryDto } from "@/lib/api/members";
import { ApiError } from "@/lib/api/client";
import { formatDate, formatRwf } from "@/lib/format";
import type { ShareWithdrawalRequest } from "@/lib/types";

/**
 * Staff decide members' share withdrawal requests (POST /share-withdrawals/{id}/decision,
 * SECRETARY or ORG_ADMIN). Approving moves the shares and money for real: the member's
 * holding goes down and a withdrawal is written to their savings ledger.
 */
export default function SecretaryShareWithdrawalsPage() {
  const { data: members = [] } = useMembers();
  const { data: requests = [] } = useShareWithdrawalRequests();
  const decide = useDecideShareWithdrawal();

  const [pendingAction, setPendingAction] = React.useState<{
    request: ShareWithdrawalRequest;
    decision: "approve" | "reject";
  } | null>(null);

  const memberById = React.useMemo(() => {
    const map = new Map<string, MemberSummaryDto>();
    for (const m of members) map.set(m.id, m);
    return map;
  }, [members]);
  const memberName = (id: string) => memberById.get(id)?.fullName ?? "Unknown Member";
  const memberEmployeeId = (id: string) => memberById.get(id)?.employeeId ?? "—";

  const sorted = [...requests].sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (b.status === "pending" && a.status !== "pending") return 1;
    return new Date(b.requestedDate).getTime() - new Date(a.requestedDate).getTime();
  });
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Share Withdrawals</h1>
        <p className="text-sm text-muted-foreground">
          Approve or reject members&apos; requests to withdraw shares. Approving pays out the share value and reduces
          their holding.
        </p>
      </div>

      {decide.isError && (
        <p className="text-sm text-destructive">
          {decide.error instanceof ApiError ? decide.error.message : "Something went wrong. Please try again."}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            All Requests ({sorted.length}){pendingCount > 0 ? ` · ${pendingCount} waiting` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: "Member", cell: (r) => memberName(r.memberId) },
              { header: "Employee ID", cell: (r) => memberEmployeeId(r.memberId) },
              { header: "Shares", cell: (r) => r.shares, className: "text-right tabular-nums", headClassName: "text-right" },
              { header: "Value", cell: (r) => formatRwf(r.amount), className: "text-right tabular-nums", headClassName: "text-right" },
              { header: "Requested", cell: (r) => formatDate(r.requestedDate) },
              { header: "Status", cell: (r) => <RequestStatusBadge status={r.status} /> },
              {
                header: "Decided",
                cell: (r) =>
                  r.decidedDate ? (
                    <span className="text-xs text-muted-foreground">
                      {formatDate(r.decidedDate)} by {r.decidedBy}
                    </span>
                  ) : (
                    "—"
                  ),
              },
              {
                header: "Actions",
                cell: (r) =>
                  r.status === "pending" ? (
                    <div className="flex gap-1.5">
                      <Button size="sm" onClick={() => setPendingAction({ request: r, decision: "approve" })}>
                        <Check className="size-3.5" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPendingAction({ request: r, decision: "reject" })}
                      >
                        <X className="size-3.5" /> Reject
                      </Button>
                    </div>
                  ) : (
                    "—"
                  ),
              },
            ]}
            rows={sorted}
            rowKey={(r) => r.id}
            getSearchText={(r) => `${memberName(r.memberId)} ${memberEmployeeId(r.memberId)}`}
            searchPlaceholder="Search by member name or employee ID..."
            emptyMessage="No share withdrawal requests yet."
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!pendingAction}
        onOpenChange={(open) => !open && setPendingAction(null)}
        title={pendingAction?.decision === "approve" ? "Approve share withdrawal?" : "Reject share withdrawal?"}
        description={
          pendingAction
            ? pendingAction.decision === "approve"
              ? `${memberName(pendingAction.request.memberId)} gives up ${pendingAction.request.shares} share(s) and is paid ${formatRwf(pendingAction.request.amount)}. This can't be undone.`
              : `${memberName(pendingAction.request.memberId)} keeps their shares.`
            : undefined
        }
        confirmLabel={pendingAction?.decision === "approve" ? "Approve" : "Reject"}
        tone={pendingAction?.decision === "reject" ? "destructive" : "default"}
        onConfirm={() => {
          if (!pendingAction) return;
          decide.mutate({ id: pendingAction.request.id, decision: pendingAction.decision });
        }}
      />
    </div>
  );
}
