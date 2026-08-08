"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoanStatusBadge } from "@/components/shared/status-badge";
import { LoanStagePipeline, LoanTimelineList } from "@/components/shared/loan-timeline";
import { useDataStore } from "@/lib/store/data-store";
import { formatDate, formatRwf } from "@/lib/format";

const CONTRACT_VISIBLE_STATUSES = ["contract-generated", "disbursed", "repaying", "completed"];

export default function MemberLoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const loans = useDataStore((s) => s.loans);
  const members = useDataStore((s) => s.members);
  const loan = loans.find((l) => l.id === id);

  if (!loan) notFound();

  const guarantors = members.filter((m) => loan.guarantorIds.includes(m.id));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" render={<Link href="/member/loans" />} className="mb-2 -ml-2">
          <ArrowLeft className="size-3.5" /> Back to my loans
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{loan.contractNumber}</h1>
            <p className="text-sm text-muted-foreground">{loan.purpose}</p>
          </div>
          <div className="flex items-center gap-2">
            <LoanStatusBadge status={loan.status} />
            {CONTRACT_VISIBLE_STATUSES.includes(loan.status) && (
              <Button size="sm" render={<Link href={`/member/loans/${loan.id}/contract`} />}>
                <FileText className="size-3.5" /> View Contract
              </Button>
            )}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <LoanStagePipeline loan={loan} />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Loan Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="text-right font-medium">{formatRwf(loan.amount)}</dd>
              <dt className="text-muted-foreground">Interest ({loan.interestRate}%)</dt>
              <dd className="text-right font-medium">{formatRwf(Math.round((loan.amount * loan.interestRate) / 100))}</dd>
              <dt className="text-muted-foreground">Insurance</dt>
              <dd className="text-right font-medium">
                {loan.insuranceRequired ? formatRwf(loan.insuranceFee) : "Not required"}
              </dd>
              <dt className="text-muted-foreground">Repayment period</dt>
              <dd className="text-right font-medium">{loan.periodMonths} months</dd>
              <dt className="text-muted-foreground">Monthly installment</dt>
              <dd className="text-right font-medium">{formatRwf(loan.monthlyInstallment)}</dd>
              <dt className="border-t pt-2 text-muted-foreground">Total payable</dt>
              <dd className="border-t pt-2 text-right font-semibold">{formatRwf(loan.totalPayable)}</dd>
              <dt className="text-muted-foreground">Remaining balance</dt>
              <dd className="text-right font-semibold text-primary">{formatRwf(loan.remainingBalance)}</dd>
              <dt className="text-muted-foreground">Applied on</dt>
              <dd className="text-right font-medium">{formatDate(loan.appliedDate)}</dd>
              {guarantors.length > 0 && (
                <>
                  <dt className="text-muted-foreground">Guarantor(s)</dt>
                  <dd className="text-right font-medium">
                    {guarantors.map((g) => g.fullName).join(", ")}
                  </dd>
                </>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <LoanTimelineList loan={loan} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
