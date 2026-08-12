import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/data-table";
import { ToneBadge, type Tone } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/format";

interface SupportTicket {
  id: string;
  subject: string;
  organizationName: string;
  status: "open" | "resolved";
  priority: "low" | "medium" | "high";
  createdDate: string;
}

const SUPPORT_TICKETS: SupportTicket[] = [
  {
    id: "tkt-1",
    subject: "Payroll import failing for June",
    organizationName: "Musanze Teachers SACCO",
    status: "open",
    priority: "high",
    createdDate: "2026-07-29",
  },
  {
    id: "tkt-2",
    subject: "Request to increase member limit",
    organizationName: "Huye Health Workers Cooperative",
    status: "open",
    priority: "medium",
    createdDate: "2026-07-31",
  },
  {
    id: "tkt-3",
    subject: "Cannot generate loan contract PDF",
    organizationName: "APUPEKA Digital Savings and Loan Cooperative",
    status: "resolved",
    priority: "high",
    createdDate: "2026-07-20",
  },
  {
    id: "tkt-4",
    subject: "Billing invoice discrepancy",
    organizationName: "Rubavu Traders Savings Group",
    status: "open",
    priority: "medium",
    createdDate: "2026-08-02",
  },
  {
    id: "tkt-5",
    subject: "New branch onboarding question",
    organizationName: "Nyagatare Farmers Cooperative",
    status: "resolved",
    priority: "low",
    createdDate: "2026-07-15",
  },
  {
    id: "tkt-6",
    subject: "Password reset not received",
    organizationName: "Musanze Teachers SACCO",
    status: "resolved",
    priority: "low",
    createdDate: "2026-07-25",
  },
];

const STATUS_TONE: Record<SupportTicket["status"], Tone> = {
  open: "warning",
  resolved: "success",
};

const PRIORITY_TONE: Record<SupportTicket["priority"], Tone> = {
  low: "neutral",
  medium: "info",
  high: "destructive",
};

export default function SuperAdminSupportPage() {
  const openCount = SUPPORT_TICKETS.filter((t) => t.status === "open").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Support Center</h1>
        <p className="text-sm text-muted-foreground">
          {openCount} open ticket{openCount === 1 ? "" : "s"} across all organizations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Support Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: "Subject", cell: (r) => r.subject },
              { header: "Organization", cell: (r) => r.organizationName },
              {
                header: "Priority",
                cell: (r) => (
                  <ToneBadge tone={PRIORITY_TONE[r.priority]} label={r.priority[0].toUpperCase() + r.priority.slice(1)} />
                ),
              },
              {
                header: "Status",
                cell: (r) => (
                  <ToneBadge tone={STATUS_TONE[r.status]} label={r.status === "open" ? "Open" : "Resolved"} />
                ),
              },
              { header: "Created", cell: (r) => formatDate(r.createdDate) },
            ]}
            rows={SUPPORT_TICKETS}
            rowKey={(r) => r.id}
            emptyMessage="No support tickets."
          />
        </CardContent>
      </Card>
    </div>
  );
}
