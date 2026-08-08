"use client";

import * as React from "react";
import { PauseCircle, PlayCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { ToneBadge, type Tone } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { useDataStore } from "@/lib/store/data-store";
import { formatDate, formatNumber } from "@/lib/format";
import type { Organization } from "@/lib/types";

const PLAN_TONE: Record<Organization["plan"], Tone> = {
  starter: "neutral",
  growth: "info",
  enterprise: "success",
};

const PLAN_LABEL: Record<Organization["plan"], string> = {
  starter: "Starter",
  growth: "Growth",
  enterprise: "Enterprise",
};

const STATUS_TONE: Record<Organization["status"], Tone> = {
  active: "success",
  trial: "info",
  suspended: "destructive",
};

const STATUS_LABEL: Record<Organization["status"], string> = {
  active: "Active",
  trial: "Trial",
  suspended: "Suspended",
};

export default function SuperAdminOrganizationsPage() {
  const { user } = useCurrentUser();
  const organizations = useDataStore((s) => s.organizations);
  const setOrganizationStatus = useDataStore((s) => s.setOrganizationStatus);

  const [target, setTarget] = React.useState<Organization | null>(null);

  const actorName = user?.fullName ?? "Super Admin";
  const nextStatus: Organization["status"] | null = target
    ? target.status === "suspended"
      ? "active"
      : "suspended"
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Organizations</h1>
        <p className="text-sm text-muted-foreground">
          Every cooperative running on IkiminaConnect, their plan and current status.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">All Organizations</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: "Name", cell: (r) => r.name },
              { header: "District", cell: (r) => r.district },
              { header: "Plan", cell: (r) => <ToneBadge tone={PLAN_TONE[r.plan]} label={PLAN_LABEL[r.plan]} /> },
              { header: "Members", cell: (r) => formatNumber(r.memberCount) },
              { header: "Status", cell: (r) => <ToneBadge tone={STATUS_TONE[r.status]} label={STATUS_LABEL[r.status]} /> },
              { header: "Created", cell: (r) => formatDate(r.createdAt) },
              {
                header: "",
                headClassName: "w-px",
                cell: (r) =>
                  r.status === "suspended" ? (
                    <Button variant="outline" size="sm" onClick={() => setTarget(r)}>
                      <PlayCircle className="size-3.5" /> Activate
                    </Button>
                  ) : (
                    <Button variant="destructive" size="sm" onClick={() => setTarget(r)}>
                      <PauseCircle className="size-3.5" /> Suspend
                    </Button>
                  ),
              },
            ]}
            rows={organizations}
            rowKey={(r) => r.id}
            emptyMessage="No organizations found."
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!target}
        onOpenChange={(open) => !open && setTarget(null)}
        title={nextStatus === "active" ? "Activate this organization?" : "Suspend this organization?"}
        description={
          target
            ? nextStatus === "active"
              ? `${target.name} will regain full access to the platform.`
              : `${target.name} and its members will immediately lose access until reactivated.`
            : undefined
        }
        confirmLabel={nextStatus === "active" ? "Activate organization" : "Suspend organization"}
        tone={nextStatus === "active" ? "default" : "destructive"}
        onConfirm={() => {
          if (target && nextStatus) setOrganizationStatus(target.id, nextStatus, actorName);
        }}
      />
    </div>
  );
}
