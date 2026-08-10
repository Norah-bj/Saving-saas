import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { UserX } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { useDataStore } from "@/lib/store/data-store";
import { formatDate } from "@/lib/format";

export default function SecretarySuspendedMembersPage() {
  const { user } = useCurrentUser();
  const members = useDataStore((s) => s.members);

  if (!user) return null;

  const suspended = members.filter(
    (m) => m.organizationId === user.organizationId && m.status === "suspended"
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Suspended Members</h1>
        <p className="text-sm text-muted-foreground">
          A read-only view of members currently suspended from the organization.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
        <Info className="mt-0.5 size-4 shrink-0" />
        <span>
          The Secretary role has view-only access to suspended members. Reactivating a member is
          performed by the Organization Admin from the Suspend / Activate page.
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Suspended Members ({suspended.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {suspended.length === 0 ? (
            <EmptyState icon={UserX} title="No suspended members" description="All members are currently in good standing." />
          ) : (
            <DataTable
              columns={[
                { header: "Name", cell: (r) => r.fullName },
                { header: "Employee ID", cell: (r) => r.employeeId },
                { header: "Department", cell: (r) => r.department },
                { header: "Position", cell: (r) => r.position },
                { header: "Date Joined", cell: (r) => formatDate(r.dateJoined) },
              ]}
              rows={suspended}
              rowKey={(r) => r.id}
              getSearchText={(r) => `${r.fullName} ${r.employeeId} ${r.department}`}
              searchPlaceholder="Search suspended members..."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
