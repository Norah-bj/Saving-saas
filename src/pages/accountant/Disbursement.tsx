import * as React from "react";
import { Link } from "react-router-dom";
import { FileSignature, Banknote, HandCoins, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { LoanStatusBadge } from "@/components/shared/status-badge";
import { useLoans, useGenerateContract, useDisburse, useRecordRepayment } from "@/lib/api/loans";
import { useMembers } from "@/lib/api/members";
import { ApiError } from "@/lib/api/client";
import { formatRwf } from "@/lib/format";

export default function LoanDisbursementPage() {
  const { data: loans = [] } = useLoans();
  const { data: members = [] } = useMembers();
  const generateContract = useGenerateContract();
  const disburse = useDisburse();
  const recordRepayment = useRecordRepayment();

  const [confirmDisburseId, setConfirmDisburseId] = React.useState<string | null>(null);

  const readyForContract = loans.filter((l) => l.status === "approved");
  const readyToDisburse = loans.filter((l) => l.status === "contract-generated");
  const activeLoans = loans.filter((l) => l.status === "disbursed" || l.status === "repaying");

  const memberName = (id: string) => members.find((m) => m.id === id)?.fullName ?? "—";
  const disburseTarget = loans.find((l) => l.id === confirmDisburseId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Loan Disbursement</h1>
        <p className="text-sm text-muted-foreground">
          Generate loan contracts, disburse approved funds, and record ongoing repayments.
        </p>
      </div>

      {(generateContract.isError || disburse.isError || recordRepayment.isError) && (
        <p className="text-sm text-destructive">
          {[generateContract, disburse, recordRepayment]
            .map((m) => (m.error instanceof ApiError ? m.error.message : null))
            .find(Boolean) ?? "Something went wrong."}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Approved — Ready for Contract</CardTitle>
          <CardDescription>Approved loans awaiting a generated loan agreement.</CardDescription>
        </CardHeader>
        <CardContent>
          {readyForContract.length === 0 ? (
            <EmptyState icon={FileSignature} title="Nothing waiting on a contract" />
          ) : (
            <DataTable
              columns={[
                { header: "Contract #", cell: (r) => r.contractNumber },
                { header: "Member", cell: (r) => memberName(r.memberId) },
                { header: "Amount", cell: (r) => formatRwf(r.amount) },
                {
                  header: "Action",
                  cell: (r) => (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" render={<Link to={`/loans/${r.id}/contract`} />}>
                        <Eye className="size-3.5" /> Preview
                      </Button>
                      <Button size="sm" onClick={() => generateContract.mutate(r.id)}>
                        <FileSignature className="size-3.5" /> Generate Contract
                      </Button>
                    </div>
                  ),
                },
              ]}
              rows={readyForContract}
              rowKey={(r) => r.id}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Contract Generated — Ready to Disburse</CardTitle>
          <CardDescription>Contracts are signed; funds can now be released.</CardDescription>
        </CardHeader>
        <CardContent>
          {readyToDisburse.length === 0 ? (
            <EmptyState icon={Banknote} title="Nothing waiting on disbursement" />
          ) : (
            <DataTable
              columns={[
                { header: "Contract #", cell: (r) => r.contractNumber },
                { header: "Member", cell: (r) => memberName(r.memberId) },
                { header: "Amount", cell: (r) => formatRwf(r.amount) },
                {
                  header: "Action",
                  cell: (r) => (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" render={<Link to={`/loans/${r.id}/contract`} />}>
                        <Eye className="size-3.5" /> View Contract
                      </Button>
                      <Button size="sm" onClick={() => setConfirmDisburseId(r.id)}>
                        <Banknote className="size-3.5" /> Disburse Funds
                      </Button>
                    </div>
                  ),
                },
              ]}
              rows={readyToDisburse}
              rowKey={(r) => r.id}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Active Loans — Repayments</CardTitle>
          <CardDescription>Record the next scheduled installment for active loans.</CardDescription>
        </CardHeader>
        <CardContent>
          {activeLoans.length === 0 ? (
            <EmptyState icon={HandCoins} title="No active loans" />
          ) : (
            <DataTable
              columns={[
                { header: "Contract #", cell: (r) => r.contractNumber },
                { header: "Member", cell: (r) => memberName(r.memberId) },
                { header: "Remaining Balance", cell: (r) => formatRwf(r.remainingBalance) },
                { header: "Monthly Installment", cell: (r) => formatRwf(r.monthlyInstallment) },
                { header: "Status", cell: (r) => <LoanStatusBadge status={r.status} /> },
                {
                  header: "Action",
                  cell: (r) => (
                    <Button size="sm" variant="outline" onClick={() => recordRepayment.mutate(r.id)}>
                      Record Next Repayment
                    </Button>
                  ),
                },
              ]}
              rows={activeLoans}
              rowKey={(r) => r.id}
            />
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!confirmDisburseId}
        onOpenChange={(open) => !open && setConfirmDisburseId(null)}
        title="Disburse loan funds?"
        description={
          disburseTarget
            ? `${formatRwf(disburseTarget.amount)} will be disbursed to ${memberName(disburseTarget.memberId)} for contract ${disburseTarget.contractNumber}.`
            : undefined
        }
        confirmLabel="Disburse Funds"
        onConfirm={() => {
          if (confirmDisburseId) disburse.mutate(confirmDisburseId);
        }}
      />
    </div>
  );
}
