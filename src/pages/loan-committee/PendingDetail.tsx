import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle, PlayCircle, SearchX, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { LoanStatusBadge, GuaranteeStatusBadge, ToneBadge } from "@/components/shared/status-badge";
import { LoanStagePipeline, LoanTimelineList } from "@/components/shared/loan-timeline";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { useDataStore } from "@/lib/store/data-store";
import { riskBand } from "@/lib/loan-calculator";
import { monthsBetween, MOCK_TODAY } from "@/lib/mock-data";
import { formatRwf } from "@/lib/format";
import { LOAN_STATUS_ORDER } from "@/lib/types";

const CONTRACT_VISIBLE_STATUSES = LOAN_STATUS_ORDER.slice(LOAN_STATUS_ORDER.indexOf("approved"));

export default function LoanReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const loans = useDataStore((s) => s.loans);
  const members = useDataStore((s) => s.members);
  const guarantees = useDataStore((s) => s.guarantees);
  const savingsBalance = useDataStore((s) => s.savingsBalance);
  const startLoanReview = useDataStore((s) => s.startLoanReview);
  const committeeDecision = useDataStore((s) => s.committeeDecision);

  const [notes, setNotes] = React.useState("");
  const [confirmApprove, setConfirmApprove] = React.useState(false);
  const [confirmReject, setConfirmReject] = React.useState(false);

  const loan = loans.find((l) => l.id === id);

  if (!loan) {
    return (
      <EmptyState
        icon={SearchX}
        title="Loan not found"
        description="This loan application doesn't exist or may have been removed."
        action={
          <Button size="sm" render={<Link to="/loan-committee/pending" />}>
            Back to pending applications
          </Button>
        }
      />
    );
  }

  const member = members.find((m) => m.id === loan.memberId)!;
  const guarantee = guarantees.find((g) => g.loanId === loan.id);
  const savings = savingsBalance(member.id);
  const tenureMonths = monthsBetween(member.dateJoined, MOCK_TODAY);
  const dsr = member.monthlySalary > 0 ? loan.monthlyInstallment / member.monthlySalary : 1;
  const band = riskBand(loan.riskScore);

  const actorName = user?.fullName ?? "Loan Committee";

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" render={<Link to="/loan-committee/pending" />} className="mb-2 -ml-2">
          <ArrowLeft className="size-3.5" /> Back to pending applications
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{loan.contractNumber}</h1>
            <p className="text-sm text-muted-foreground">
              {member.fullName} · {member.department} · {formatRwf(member.monthlySalary)}/month
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LoanStatusBadge status={loan.status} />
            {CONTRACT_VISIBLE_STATUSES.includes(loan.status) && (
              <Button size="sm" variant="outline" render={<Link to={`/loans/${loan.id}/contract`} />}>
                <FileText className="size-3.5" /> View Contract
              </Button>
            )}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">Progress</CardTitle></CardHeader>
        <CardContent><LoanStagePipeline loan={loan} /></CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Savings Analysis</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            <p className="text-lg font-semibold">{formatRwf(savings)}</p>
            <p className="text-xs text-muted-foreground">
              Requested {formatRwf(loan.amount)} ({((loan.amount / Math.max(savings, 1)) * 100).toFixed(0)}% of savings)
            </p>
            <p className="text-xs text-muted-foreground">Member for {tenureMonths} months</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Guarantor Analysis</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {guarantee ? (
              <>
                <p className="text-sm font-medium">
                  {members.find((m) => m.id === guarantee.guarantorId)?.fullName}
                </p>
                <GuaranteeStatusBadge status={guarantee.status} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No guarantor required</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Salary / DSR Analysis</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            <p className="text-lg font-semibold">{(dsr * 100).toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">
              {formatRwf(loan.monthlyInstallment)} installment vs {formatRwf(member.monthlySalary)} salary
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
          <ToneBadge tone={band.tone} label={band.label} />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Progress value={loan.riskScore} className="h-2" />
            <span className="w-12 text-right text-sm font-medium">{loan.riskScore}/100</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Loan Terms</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Purpose</dt>
              <dd className="text-right font-medium">{loan.purpose}</dd>
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="text-right font-medium">{formatRwf(loan.amount)}</dd>
              <dt className="text-muted-foreground">Interest ({loan.interestRate}%)</dt>
              <dd className="text-right font-medium">{formatRwf(Math.round((loan.amount * loan.interestRate) / 100))}</dd>
              <dt className="text-muted-foreground">Insurance</dt>
              <dd className="text-right font-medium">{loan.insuranceRequired ? formatRwf(loan.insuranceFee) : "N/A"}</dd>
              <dt className="text-muted-foreground">Period</dt>
              <dd className="text-right font-medium">{loan.periodMonths} months</dd>
              <dt className="border-t pt-2 text-muted-foreground">Monthly Installment</dt>
              <dd className="border-t pt-2 text-right font-semibold">{formatRwf(loan.monthlyInstallment)}</dd>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Timeline</CardTitle></CardHeader>
          <CardContent><LoanTimelineList loan={loan} /></CardContent>
        </Card>
      </div>

      {(loan.status === "submitted" || loan.status === "under-review") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Start Review</CardTitle>
            <CardDescription>
              Confirm the application against membership and savings records, then forward it
              to {loan.insuranceRequired ? "the guarantor" : "the Loan Committee"}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => startLoanReview(loan.id, actorName)}>
              <PlayCircle className="size-4" /> Start Review
            </Button>
          </CardContent>
        </Card>
      )}

      {loan.status === "guarantor-approval" && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Awaiting guarantor response from{" "}
            <span className="font-medium text-foreground">
              {members.find((m) => m.id === guarantee?.guarantorId)?.fullName}
            </span>
            . This application will move to Committee Review automatically once the guarantor accepts.
          </CardContent>
        </Card>
      )}

      {loan.status === "committee-review" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Committee Decision</CardTitle>
            <CardDescription>Record the committee&apos;s decision and any notes for the member.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Textarea
              placeholder="Decision notes (optional for approval, recommended for rejection)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button onClick={() => setConfirmApprove(true)} className="gap-1.5">
                <CheckCircle2 className="size-4" /> Approve
              </Button>
              <Button variant="destructive" onClick={() => setConfirmReject(true)} className="gap-1.5">
                <XCircle className="size-4" /> Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loan.committeeNotes && loan.status === "rejected" && (
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader><CardTitle className="text-sm font-medium text-destructive">Rejection Notes</CardTitle></CardHeader>
          <CardContent className="text-sm">{loan.committeeNotes}</CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={confirmApprove}
        onOpenChange={setConfirmApprove}
        title="Approve this loan?"
        description={`${member.fullName} will be notified and a contract can then be generated.`}
        confirmLabel="Approve loan"
        onConfirm={() => {
          committeeDecision(loan.id, "approve", actorName, notes || undefined);
          navigate("/loan-committee/pending");
        }}
      />
      <ConfirmDialog
        open={confirmReject}
        onOpenChange={setConfirmReject}
        title="Reject this loan?"
        description="The member will see your notes explaining the decision."
        confirmLabel="Reject loan"
        tone="destructive"
        onConfirm={() => {
          committeeDecision(loan.id, "reject", actorName, notes || undefined);
          navigate("/loan-committee/pending");
        }}
      />
    </div>
  );
}
