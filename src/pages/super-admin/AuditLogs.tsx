import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/shared/data-table";
import { useDataStore } from "@/lib/store/data-store";
import { formatDate } from "@/lib/format";

export default function SuperAdminAuditLogsPage() {
  const auditLogs = useDataStore((s) => s.auditLogs);
  const organizations = useDataStore((s) => s.organizations);

  const [filter, setFilter] = React.useState("all");

  const sortedLogs = [...auditLogs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const filteredLogs = sortedLogs.filter((log) => {
    if (filter === "all") return true;
    if (filter === "platform") return log.organizationId === "platform";
    return log.organizationId === filter;
  });

  function orgName(organizationId: string) {
    if (organizationId === "platform") return "Platform";
    return organizations.find((o) => o.id === organizationId)?.name ?? organizationId;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">
          A record of every consequential action taken across the platform and every organization.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-sm font-medium">All Activity</CardTitle>
          <Select value={filter} onValueChange={(v) => setFilter(v ?? "all")}>
            <SelectTrigger size="sm" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="platform">Platform</SelectItem>
              {organizations.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: "Actor", cell: (r) => r.actor },
              { header: "Action", cell: (r) => r.action },
              { header: "Target", cell: (r) => r.target },
              { header: "Organization", cell: (r) => orgName(r.organizationId) },
              { header: "Date", cell: (r) => formatDate(r.date) },
            ]}
            rows={filteredLogs}
            rowKey={(r) => r.id}
            emptyMessage="No audit log entries for this filter."
          />
        </CardContent>
      </Card>
    </div>
  );
}
