import { Link } from "react-router-dom";
import { ClipboardList, CheckCircle2, XCircle, Gauge, ArrowRight } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/shared/chart-card";
import { DonutChart } from "@/components/charts/donut-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoanStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useLoans, type LoanSummary } from "@/lib/api/loans";
import { useMembers } from "@/lib/api/members";
import { formatDate, formatRwf } from "@/lib/format";
import type { LoanStatus } from "@/lib/types";

const PENDING_STATUSES: LoanStatus[] = [
  "submitted",
  "under-review",
  "guarantor-approval",
  "committee-review",
];

const APPROVED_LIKE: LoanStatus[] = [
  "approved",
  "contract-generated",
  "disbursed",
  "repaying",
  "completed",
];

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
}

function decisionDate(loan: LoanSummary) {
  return loan.decidedDate ?? loan.appliedDate;
}

export default function LoanCommitteeDashboardPage() {
  const { data: loans = [] } = useLoans();
  const { data: members = [] } = useMembers();

  const currentMonthKey = monthKey(new Date().toISOString());

  const pendingCount = loans.filter((l) => PENDING_STATUSES.includes(l.status)).length;
  const approvedThisMonth = loans.filter(
    (l) => l.decidedDate && APPROVED_LIKE.includes(l.status) && monthKey(l.decidedDate) === currentMonthKey
  ).length;
  const rejectedThisMonth = loans.filter(
    (l) => l.status === "rejected" && l.decidedDate && monthKey(l.decidedDate) === currentMonthKey
  ).length;
  const averageRiskScore = loans.length
    ? Math.round(loans.reduce((sum, l) => sum + l.riskScore, 0) / loans.length)
    : 0;

  const approvedCount = loans.filter((l) => APPROVED_LIKE.includes(l.status)).length;
  const rejectedCount = loans.filter((l) => l.status === "rejected").length;
  const totalDecided = approvedCount + rejectedCount;

  const recentDecisions = loans
    .filter((l) => l.status === "approved" || l.status === "rejected")
    .sort((a, b) => (decisionDate(a) < decisionDate(b) ? 1 : -1))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Loan Committee Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Review activity and portfolio-wide decision statistics.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pending Applications"
          value={String(pendingCount)}
          icon={ClipboardList}
          description="Awaiting review or decision"
        />
        <StatCard
          label="Approved This Month"
          value={String(approvedThisMonth)}
          icon={CheckCircle2}
          description={new Date().toLocaleDateString("en-RW", { month: "long" })}
        />
        <StatCard
          label="Rejected This Month"
          value={String(rejectedThisMonth)}
          icon={XCircle}
          description={new Date().toLocaleDateString("en-RW", { month: "long" })}
        />
        <StatCard
          label="Average Risk Score"
          value={`${averageRiskScore}/100`}
          icon={Gauge}
          description={`Across ${loans.length} loans`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Loan Approval Rate"
          description="Approved vs rejected, all-time"
          className="lg:col-span-1"
        >
          <DonutChart
            data={[
              { key: "approved", label: "Approved", value: approvedCount, color: "var(--chart-2)" },
              { key: "rejected", label: "Rejected", value: rejectedCount, color: "var(--chart-4)" },
            ]}
            centerValue={totalDecided ? `${Math.round((approvedCount / totalDecided) * 100)}%` : "—"}
            centerLabel="Approved"
          />
        </ChartCard>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Recent Decisions</CardTitle>
            <Button variant="ghost" size="sm" render={<Link to="/loan-committee/decisions" />}>
              View all <ArrowRight className="size-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {recentDecisions.length === 0 ? (
              <EmptyState icon={ClipboardList} title="No decisions yet" />
            ) : (
              recentDecisions.map((loan) => (
                <Link
                  key={loan.id}
                  to={`/loan-committee/pending/${loan.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/40"
                >
                  <div>
                    <p className="text-sm font-medium">{loan.contractNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {members.find((m) => m.id === loan.memberId)?.fullName ?? "—"} ·{" "}
                      {formatRwf(loan.amount)} · {formatDate(decisionDate(loan))}
                    </p>
                  </div>
                  <LoanStatusBadge status={loan.status} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
