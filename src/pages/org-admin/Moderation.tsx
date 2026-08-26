import * as React from "react";
import { UserCheck, UserX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { MemberStatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useOrganization } from "@/lib/api/organization";
import { useMembers, useUpdateMemberStatus, type MemberSummaryDto } from "@/lib/api/members";
import { ApiError } from "@/lib/api/client";

export default function OrgAdminModerationPage() {
  const { data: organization } = useOrganization();
  const { data: orgMembers = [] } = useMembers();
  const updateStatus = useUpdateMemberStatus();

  const [suspendTarget, setSuspendTarget] = React.useState<MemberSummaryDto | null>(null);

  if (!organization) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Suspend / Activate</h1>
        <p className="text-sm text-muted-foreground">
          Control member access to {organization.shortName} without deleting their records.
        </p>
      </div>

      {updateStatus.isError && (
        <p className="text-sm text-destructive">
          {updateStatus.error instanceof ApiError ? updateStatus.error.message : "Something went wrong."}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Organization Members</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: "Name", cell: (r) => r.fullName },
              { header: "Employee ID", cell: (r) => r.employeeId },
              { header: "Department", cell: (r) => r.department },
              { header: "Status", cell: (r) => <MemberStatusBadge status={r.status as never} /> },
              {
                header: "",
                headClassName: "w-px",
                cell: (r) =>
                  r.status === "active" ? (
                    <Button variant="destructive" size="sm" onClick={() => setSuspendTarget(r)}>
                      <UserX className="size-3.5" /> Suspend
                    </Button>
                  ) : r.status === "suspended" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateStatus.mutate({ memberId: r.id, status: "active" })}
                    >
                      <UserCheck className="size-3.5" /> Activate
                    </Button>
                  ) : null,
              },
            ]}
            rows={orgMembers}
            rowKey={(r) => r.id}
            getSearchText={(r) => `${r.fullName} ${r.employeeId} ${r.department}`}
            searchPlaceholder="Search members..."
            emptyMessage="No members found."
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!suspendTarget}
        onOpenChange={(open) => !open && setSuspendTarget(null)}
        title="Suspend this member?"
        description={
          suspendTarget
            ? `${suspendTarget.fullName} will immediately lose access to their account until reactivated.`
            : undefined
        }
        confirmLabel="Suspend member"
        tone="destructive"
        onConfirm={() => {
          if (suspendTarget) updateStatus.mutate({ memberId: suspendTarget.id, status: "suspended" });
        }}
      />
    </div>
  );
}
