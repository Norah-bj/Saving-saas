import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/data-table";
import { useOrganization } from "@/lib/api/organization";
import { useBackups } from "@/lib/api/backups";
import { formatDate } from "@/lib/format";

/**
 * Read-only since gap-closure phase 6 — a real pg_dump only ever makes
 * sense platform-wide (see docs/DECISIONS.md), so only SUPER_ADMIN can
 * trigger one (super-admin/Backups.tsx). This page shows the same
 * platform-wide backups, which already cover this org's data. There is no
 * in-app restore: restoring is a manual platform-operations task, so this
 * page says so instead of offering a button that would do nothing.
 */
export default function OrgAdminBackupsPage() {
  const { data: organization } = useOrganization();
  const { data: orgBackups = [] } = useBackups();

  if (!organization) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Backups</h1>
        <p className="text-sm text-muted-foreground">
          Platform-wide data snapshots, which cover {organization.shortName}&apos;s data too.
          Backups are managed at the platform level.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-muted-foreground">
          Need data restored from one of these backups? Contact the platform administrator.
          Restores are carried out by platform operations, not from this page.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Backup History</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: "Label", cell: (r) => r.label },
              { header: "Type", cell: (r) => <span className="capitalize">{r.type}</span> },
              { header: "Date", cell: (r) => formatDate(r.date) },
              { header: "Size", cell: (r) => `${r.sizeMb} MB` },
            ]}
            rows={orgBackups}
            rowKey={(r) => r.id}
            emptyMessage="No backups yet."
          />
        </CardContent>
      </Card>
    </div>
  );
}
