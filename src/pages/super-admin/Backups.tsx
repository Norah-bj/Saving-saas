import { DatabaseBackup } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { useDataStore } from "@/lib/store/data-store";
import { formatDate } from "@/lib/format";

export default function SuperAdminBackupsPage() {
  const backups = useDataStore((s) => s.backups);
  const organizations = useDataStore((s) => s.organizations);
  const createBackup = useDataStore((s) => s.createBackup);

  const sortedBackups = [...backups].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  function orgName(organizationId: string) {
    if (organizationId === "platform") return "Platform";
    return organizations.find((o) => o.id === organizationId)?.name ?? organizationId;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Global Backups</h1>
          <p className="text-sm text-muted-foreground">
            Data snapshots across the platform and every organization.
          </p>
        </div>
        <Button onClick={() => createBackup("Platform-wide scheduled backup", "platform")}>
          <DatabaseBackup className="size-4" /> Create Platform Backup
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Backup History</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: "Organization", cell: (r) => orgName(r.organizationId) },
              { header: "Label", cell: (r) => r.label },
              { header: "Type", cell: (r) => <span className="capitalize">{r.type}</span> },
              { header: "Date", cell: (r) => formatDate(r.date) },
              { header: "Size", cell: (r) => `${r.sizeMb} MB` },
            ]}
            rows={sortedBackups}
            rowKey={(r) => r.id}
            emptyMessage="No backups yet."
          />
        </CardContent>
      </Card>
    </div>
  );
}
