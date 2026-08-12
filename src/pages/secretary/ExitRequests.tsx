import * as React from "react";
import { Link } from "react-router-dom";
import { Check, X, ShieldAlert, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { RequestStatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { useDataStore } from "@/lib/store/data-store";
import { formatDate } from "@/lib/format";
import type { ExitRequest } from "@/lib/types";

export default function SecretaryExitRequestsPage() {
  const { user } = useCurrentUser();
  const members = useDataStore((s) => s.members);
  const exitRequests = useDataStore((s) => s.exitRequests);
  const exitEligibility = useDataStore((s) => s.exitEligibility);
  const decideExitRequest = useDataStore((s) => s.decideExitRequest);

  const [pendingAction, setPendingAction] = React.useState<{
    request: ExitRequest;
    decision: "approve" | "reject";
  } | null>(null);

  if (!user) return null;

  const memberName = (id: string) => members.find((m) => m.id === id)?.fullName ?? "Unknown Member";
  const memberEmployeeId = (id: string) => members.find((m) => m.id === id)?.employeeId ?? "—";

  function blockReason(memberId: string): string | null {
    const eligibility = exitEligibility(memberId);
    if (eligibility.eligible) return null;
    const loan = eligibility.outstandingLoans[0];
    if (loan) return `Outstanding loan ${loan.contractNumber}`;
    const guarantee = eligibility.activeGuarantees[0];
    if (guarantee) return `Guaranteeing loan ${guarantee.loan.contractNumber}`;
    return "Not eligible";
  }

  const sorted = [...exitRequests].sort(
    (a, b) => new Date(b.requestedDate).getTime() - new Date(a.requestedDate).getTime()
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Exit Requests</h1>
        <p className="text-sm text-muted-foreground">
          Review and decide on membership exit requests submitted by members.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">All Requests ({sorted.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: "Member", cell: (r) => memberName(r.memberId) },
              { header: "Employee ID", cell: (r) => memberEmployeeId(r.memberId) },
              { header: "Reason", cell: (r) => r.reason },
              { header: "Requested", cell: (r) => formatDate(r.requestedDate) },
              {
                header: "Status",
                cell: (r) => {
                  if (r.status !== "pending") return <RequestStatusBadge status={r.status} />;
                  const reason = blockReason(r.memberId);
                  return reason ? (
                    <span className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                      <ShieldAlert className="size-3.5 shrink-0" /> Blocked — {reason}
                    </span>
                  ) : (
                    <RequestStatusBadge status={r.status} />
                  );
                },
              },
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
                cell: (r) => {
                  if (r.status === "pending") {
                    const blocked = !!blockReason(r.memberId);
                    return (
                      <div className="flex gap-2">
                        {!blocked && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-600 dark:text-emerald-400"
                            onClick={() => setPendingAction({ request: r, decision: "approve" })}
                          >
                            <Check className="size-3.5" /> Approve
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive"
                          onClick={() => setPendingAction({ request: r, decision: "reject" })}
                        >
                          <X className="size-3.5" /> Reject
                        </Button>
                      </div>
                    );
                  }
                  if (r.status === "approved") {
                    return (
                      <Button size="sm" variant="outline" render={<Link to={`/members/${r.memberId}/exit-settlement`} />}>
                        <FileText className="size-3.5" /> View Settlement
                      </Button>
                    );
                  }
                  return <span className="text-xs text-muted-foreground">No action needed</span>;
                },
              },
            ]}
            rows={sorted}
            rowKey={(r) => r.id}
            getSearchText={(r) => `${memberName(r.memberId)} ${memberEmployeeId(r.memberId)} ${r.reason}`}
            searchPlaceholder="Search exit requests..."
            emptyMessage="No exit requests have been submitted."
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!pendingAction}
        onOpenChange={(open) => !open && setPendingAction(null)}
        title={pendingAction?.decision === "approve" ? "Approve exit request?" : "Reject exit request?"}
        description={
          pendingAction
            ? pendingAction.decision === "approve"
              ? `${memberName(pendingAction.request.memberId)} will be marked as exited and lose access to member functions.`
              : `${memberName(pendingAction.request.memberId)}'s exit request will be rejected and their membership remains active.`
            : undefined
        }
        confirmLabel={pendingAction?.decision === "approve" ? "Approve" : "Reject"}
        tone={pendingAction?.decision === "reject" ? "destructive" : "default"}
        onConfirm={() => {
          if (!pendingAction) return;
          decideExitRequest(pendingAction.request.id, pendingAction.decision, user.fullName);
        }}
      />
    </div>
  );
}
