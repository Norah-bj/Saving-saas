import * as React from "react";
import { Link } from "react-router-dom";
import { Check, X, ShieldAlert, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { RequestStatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useExitRequests, useDecideExitRequest, useExitEligibility } from "@/lib/api/membership";
import { useMembers, type MemberSummaryDto } from "@/lib/api/members";
import { ApiError } from "@/lib/api/client";
import { formatDate } from "@/lib/format";
import type { ExitRequest } from "@/lib/types";

/** Own component so useExitEligibility (a hook) can be called once per pending row without violating the Rules of Hooks. */
function BlockReasonCell({ memberId, status }: { memberId: string; status: ExitRequest["status"] }) {
  const { data: eligibility } = useExitEligibility(status === "pending" ? memberId : undefined);

  if (status !== "pending") return <RequestStatusBadge status={status} />;
  if (!eligibility || eligibility.eligible) return <RequestStatusBadge status={status} />;

  const loan = eligibility.outstandingLoans[0];
  const guarantee = eligibility.activeGuarantees[0];
  const reason = loan
    ? `Outstanding loan ${loan.contractNumber}`
    : guarantee
      ? `Guaranteeing loan ${guarantee.loanContractNumber}`
      : "Not eligible";

  return (
    <span className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
      <ShieldAlert className="size-3.5 shrink-0" /> Blocked — {reason}
    </span>
  );
}

function ActionsCell({
  request,
  blocked,
  onDecide,
}: {
  request: ExitRequest;
  blocked: boolean;
  onDecide: (decision: "approve" | "reject") => void;
}) {
  if (request.status === "pending") {
    return (
      <div className="flex gap-2">
        {!blocked && (
          <Button
            size="sm"
            variant="outline"
            className="text-emerald-600 dark:text-emerald-400"
            onClick={() => onDecide("approve")}
          >
            <Check className="size-3.5" /> Approve
          </Button>
        )}
        <Button size="sm" variant="outline" className="text-destructive" onClick={() => onDecide("reject")}>
          <X className="size-3.5" /> Reject
        </Button>
      </div>
    );
  }
  if (request.status === "approved") {
    return (
      <Button size="sm" variant="outline" render={<Link to={`/members/${request.memberId}/exit-settlement`} />}>
        <FileText className="size-3.5" /> View Settlement
      </Button>
    );
  }
  return <span className="text-xs text-muted-foreground">No action needed</span>;
}

/** Blocked status re-fetched here too (not just displayed) so Approve can be hidden without a second network round trip's delay mattering. */
function ActionsForRow({
  request,
  onDecide,
}: {
  request: ExitRequest;
  onDecide: (decision: "approve" | "reject") => void;
}) {
  const { data: eligibility } = useExitEligibility(request.status === "pending" ? request.memberId : undefined);
  const blocked = request.status === "pending" && !!eligibility && !eligibility.eligible;
  return <ActionsCell request={request} blocked={blocked} onDecide={onDecide} />;
}

export default function SecretaryExitRequestsPage() {
  const { data: members = [] } = useMembers();
  const { data: exitRequests = [] } = useExitRequests();
  const decideExitRequest = useDecideExitRequest();

  const [pendingAction, setPendingAction] = React.useState<{
    request: ExitRequest;
    decision: "approve" | "reject";
  } | null>(null);

  const memberById = React.useMemo(() => {
    const map = new Map<string, MemberSummaryDto>();
    for (const m of members) map.set(m.id, m);
    return map;
  }, [members]);

  const memberName = (id: string) => memberById.get(id)?.fullName ?? "Unknown Member";
  const memberEmployeeId = (id: string) => memberById.get(id)?.employeeId ?? "—";

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

      {decideExitRequest.isError && (
        <p className="text-sm text-destructive">
          {decideExitRequest.error instanceof ApiError
            ? decideExitRequest.error.message
            : "Something went wrong. Please try again."}
        </p>
      )}

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
                cell: (r) => <BlockReasonCell memberId={r.memberId} status={r.status} />,
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
                cell: (r) => (
                  <ActionsForRow
                    request={r}
                    onDecide={(decision) => setPendingAction({ request: r, decision })}
                  />
                ),
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
          decideExitRequest.mutate({ id: pendingAction.request.id, decision: pendingAction.decision });
        }}
      />
    </div>
  );
}
