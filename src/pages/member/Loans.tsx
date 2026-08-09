import { Link, useNavigate } from "react-router-dom";
import { HandCoins, FileSpreadsheet } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { LoanStatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { useDataStore } from "@/lib/store/data-store";
import { formatDate, formatRwf } from "@/lib/format";
import type { LoanStatus } from "@/lib/types";

const TERMINAL_STATUSES: LoanStatus[] = ["rejected", "completed"];

export default function MemberLoansPage() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const loans = useDataStore((s) => s.loans);

  if (!user) return null;

  const myLoans = loans.filter((l) => l.memberId === user.id);
  const activeLoan = myLoans.find((l) => !TERMINAL_STATUSES.includes(l.status));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">My Loans</h1>
          <p className="text-sm text-muted-foreground">
            Track every loan application you&apos;ve made, from submission through repayment.
          </p>
        </div>
        <Button render={<Link to="/member/loans/apply" />}>
          <FileSpreadsheet className="size-4" /> Apply for a new loan
        </Button>
      </div>

      {myLoans.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="You have no loans yet"
          description="Once you've built up savings, you can apply for a loan against them."
          action={
            <Button render={<Link to="/member/loans/apply" />}>
              <FileSpreadsheet className="size-4" /> Apply for a loan
            </Button>
          }
        />
      ) : (
        <>
          {activeLoan && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-medium">Active Loan — {activeLoan.contractNumber}</CardTitle>
                  <CardDescription>{activeLoan.purpose}</CardDescription>
                </div>
                <LoanStatusBadge status={activeLoan.status} />
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <StatCard label="Requested Amount" value={formatRwf(activeLoan.amount)} icon={HandCoins} />
                  <StatCard label="Remaining Balance" value={formatRwf(activeLoan.remainingBalance)} />
                  <StatCard label="Monthly Installment" value={formatRwf(activeLoan.monthlyInstallment)} />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  render={<Link to={`/member/loans/${activeLoan.id}`} />}
                >
                  View details
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">All Loans</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { header: "Contract #", cell: (r) => r.contractNumber },
                  { header: "Purpose", cell: (r) => r.purpose },
                  { header: "Amount", cell: (r) => formatRwf(r.amount) },
                  { header: "Status", cell: (r) => <LoanStatusBadge status={r.status} /> },
                  { header: "Applied", cell: (r) => formatDate(r.appliedDate) },
                ]}
                rows={myLoans}
                rowKey={(r) => r.id}
                onRowClick={(r) => navigate(`/member/loans/${r.id}`)}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
