import * as React from "react";
import { Gavel, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/shared/data-table";
import { MemberStatusBadge } from "@/components/shared/status-badge";
import { useOrganization } from "@/lib/api/organization";
import {
  useMembers,
  useUpdateMemberRoles,
  useSetCommitteeChair,
  type MemberSummaryDto,
} from "@/lib/api/members";
import { ApiError } from "@/lib/api/client";
import { ROLE_LABEL, type Role } from "@/lib/types";

const ASSIGNABLE_ROLES: Role[] = [
  "member",
  "secretary",
  "accountant",
  "loan-committee",
  "hr",
  "org-admin",
];

/**
 * Own component, not inlined in a DataTable `cell` callback — per-row hooks
 * (useSetCommitteeChair here) violate the Rules of Hooks inside a plain
 * callback. See docs/ARCHITECTURE.md.
 */
function ChairAction({ member }: { member: MemberSummaryDto }) {
  const setCommitteeChair = useSetCommitteeChair();
  const isLoanCommittee = member.roles.includes("loan-committee");

  if (!isLoanCommittee) return null;

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant={member.committeeChair ? "outline" : "ghost"}
        size="sm"
        disabled={setCommitteeChair.isPending}
        onClick={() => setCommitteeChair.mutate({ memberId: member.id, chair: !member.committeeChair })}
      >
        <Gavel className="size-3.5" /> {member.committeeChair ? "Remove Chair" : "Make Chair"}
      </Button>
      {setCommitteeChair.isError && (
        <p className="max-w-[16rem] text-xs text-destructive">
          {setCommitteeChair.error instanceof ApiError ? setCommitteeChair.error.message : "Something went wrong."}
        </p>
      )}
    </div>
  );
}

export default function OrgAdminUsersPage() {
  const { data: organization } = useOrganization();
  const { data: orgMembers = [] } = useMembers();
  const updateRoles = useUpdateMemberRoles();

  const [editing, setEditing] = React.useState<MemberSummaryDto | null>(null);
  const [checkedRoles, setCheckedRoles] = React.useState<Role[]>([]);
  const [open, setOpen] = React.useState(false);

  function openEdit(member: MemberSummaryDto) {
    setEditing(member);
    setCheckedRoles(member.roles as Role[]);
    setOpen(true);
    updateRoles.reset();
  }

  function toggleRole(role: Role, checked: boolean) {
    setCheckedRoles((prev) =>
      checked ? [...prev, role] : prev.filter((r) => r !== role)
    );
  }

  function handleSave() {
    if (!editing) return;
    const finalRoles: Role[] = checkedRoles.includes("member")
      ? checkedRoles
      : [...checkedRoles, "member"];
    updateRoles.mutate(
      { memberId: editing.id, roles: finalRoles },
      {
        onSuccess: () => {
          setOpen(false);
          setEditing(null);
        },
      }
    );
  }

  if (!organization) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Users & Roles</h1>
        <p className="text-sm text-muted-foreground">
          Manage what each member of {organization.shortName} is permitted to do.
        </p>
      </div>

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
              {
                header: "Roles",
                cell: (r) => (
                  <div className="flex flex-wrap gap-1">
                    {r.roles.map((role) => (
                      <Badge key={role} variant="outline">
                        {ROLE_LABEL[role as Role]}
                      </Badge>
                    ))}
                    {r.committeeChair && (
                      <Badge className="gap-1">
                        <Gavel className="size-3" /> Chair
                      </Badge>
                    )}
                  </div>
                ),
              },
              { header: "Status", cell: (r) => <MemberStatusBadge status={r.status as never} /> },
              {
                header: "",
                headClassName: "w-px",
                cell: (r) => (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
                      <Pencil className="size-3.5" /> Edit Roles
                    </Button>
                    <ChairAction member={r} />
                  </div>
                ),
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Roles — {editing?.fullName}</DialogTitle>
            <DialogDescription>
              Select the roles this member should hold. Every member always keeps the base
              Member role.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {ASSIGNABLE_ROLES.map((role) => (
              <div key={role} className="flex items-center gap-2">
                <Checkbox
                  id={`role-${role}`}
                  checked={role === "member" ? true : checkedRoles.includes(role)}
                  disabled={role === "member"}
                  onCheckedChange={(checked) => toggleRole(role, checked === true)}
                />
                <Label htmlFor={`role-${role}`}>{ROLE_LABEL[role]}</Label>
              </div>
            ))}
          </div>
          {updateRoles.isError && (
            <p className="text-sm text-destructive">
              {updateRoles.error instanceof ApiError ? updateRoles.error.message : "Something went wrong."}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateRoles.isPending}>
              Save Roles
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
