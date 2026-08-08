"use client";

import * as React from "react";
import { Pencil } from "lucide-react";
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
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { useDataStore } from "@/lib/store/data-store";
import { ROLE_LABEL, type AppUser, type Role } from "@/lib/types";

const ASSIGNABLE_ROLES: Role[] = [
  "member",
  "secretary",
  "accountant",
  "loan-committee",
  "hr",
  "org-admin",
];

export default function OrgAdminUsersPage() {
  const { user } = useCurrentUser();
  const organization = useDataStore((s) => s.organization);
  const members = useDataStore((s) => s.members);
  const setMemberRoles = useDataStore((s) => s.setMemberRoles);

  const orgMembers = members.filter((m) => m.organizationId === organization.id);

  const [editing, setEditing] = React.useState<AppUser | null>(null);
  const [checkedRoles, setCheckedRoles] = React.useState<Role[]>([]);
  const [open, setOpen] = React.useState(false);

  const actorName = user?.fullName ?? "Organization Admin";

  function openEdit(member: AppUser) {
    setEditing(member);
    setCheckedRoles(member.roles);
    setOpen(true);
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
    setMemberRoles(editing.id, finalRoles, actorName);
    setOpen(false);
    setEditing(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Users & Roles</h1>
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
                        {ROLE_LABEL[role]}
                      </Badge>
                    ))}
                  </div>
                ),
              },
              { header: "Status", cell: (r) => <MemberStatusBadge status={r.status} /> },
              {
                header: "",
                headClassName: "w-px",
                cell: (r) => (
                  <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
                    <Pencil className="size-3.5" /> Edit Roles
                  </Button>
                ),
              },
            ]}
            rows={orgMembers}
            rowKey={(r) => r.id}
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Roles</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
