"use client";

import * as React from "react";
import { DatabaseBackup, RotateCcw, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useDataStore } from "@/lib/store/data-store";
import { formatDate } from "@/lib/format";
import type { BackupRecord } from "@/lib/types";

export default function OrgAdminBackupsPage() {
  const organization = useDataStore((s) => s.organization);
  const backups = useDataStore((s) => s.backups);
  const createBackup = useDataStore((s) => s.createBackup);

  const orgBackups = backups.filter((b) => b.organizationId === organization.id);

  const [restoreTarget, setRestoreTarget] = React.useState<BackupRecord | null>(null);
  const [restoredIds, setRestoredIds] = React.useState<string[]>([]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Backups</h1>
          <p className="text-sm text-muted-foreground">
            Snapshots of {organization.shortName}&apos;s data for disaster recovery.
          </p>
        </div>
        <Button
          onClick={() => createBackup("Manual backup — Organization Admin", organization.id)}
        >
          <DatabaseBackup className="size-4" /> Create Manual Backup
        </Button>
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
              {
                header: "",
                headClassName: "w-px",
                cell: (r) =>
                  restoredIds.includes(r.id) ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3.5" /> Restored
                    </span>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setRestoreTarget(r)}>
                      <RotateCcw className="size-3.5" /> Restore
                    </Button>
                  ),
              },
            ]}
            rows={orgBackups}
            rowKey={(r) => r.id}
            emptyMessage="No backups yet."
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!restoreTarget}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
        title="Restore this backup?"
        description={
          restoreTarget
            ? `This will restore all organization data to the state captured on ${formatDate(restoreTarget.date)} (${restoreTarget.label}).`
            : undefined
        }
        confirmLabel="Restore backup"
        onConfirm={() => {
          if (restoreTarget) setRestoredIds((prev) => [...prev, restoreTarget.id]);
        }}
      />
    </div>
  );
}
