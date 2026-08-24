import * as React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, XCircle, ShieldCheck, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { GuaranteeStatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { useMyGuarantees, useRespondGuarantee } from "@/lib/api/guarantees";
import { formatDate, formatRwf } from "@/lib/format";

export default function MemberGuarantorsPage() {
  const { user } = useCurrentUser();
  const { data: myGuarantees = [] } = useMyGuarantees();
  const respondGuarantee = useRespondGuarantee();

  const [pendingAction, setPendingAction] = React.useState<{ guaranteeId: string; accept: boolean } | null>(null);

  if (!user) return null;

  const requestsToMe = myGuarantees.filter((g) => g.status === "pending");
  const guaranteesGiven = myGuarantees.filter((g) => g.status === "accepted");

  function borrowerName(borrowerId: string) {
    return myGuarantees.find((g) => g.borrowerId === borrowerId)?.borrowerName ?? "Unknown member";
  }

  const activeAction = pendingAction ? myGuarantees.find((g) => g.id === pendingAction.guaranteeId) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Guarantors</h1>
        <p className="text-sm text-muted-foreground">
          Manage guarantee requests you&apos;ve received and track loans you&apos;re currently guaranteeing.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
        <Info className="mt-0.5 size-4 shrink-0" />
        <span>
          A member actively guaranteeing another member&apos;s loan cannot apply for a new loan of their own until
          that guarantee is released.
        </span>
      </div>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">
            Requests to Me{requestsToMe.length > 0 ? ` (${requestsToMe.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="given">Guarantees Given</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="pt-4">
          {requestsToMe.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="No pending guarantee requests" description="You'll see requests here when another member asks you to guarantee their loan." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {requestsToMe.map((g) => (
                <Card key={g.id}>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">{borrowerName(g.borrowerId)}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <p className="text-sm text-muted-foreground">
                      Requested guarantee of <span className="font-medium text-foreground">{formatRwf(g.amountGuaranteed)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">Requested {formatDate(g.requestedDate)}</p>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => setPendingAction({ guaranteeId: g.id, accept: true })}>
                        <CheckCircle2 className="size-3.5" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setPendingAction({ guaranteeId: g.id, accept: false })}
                      >
                        <XCircle className="size-3.5" /> Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="given" className="pt-4">
          {guaranteesGiven.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="No active guarantees" description="Loans you're currently guaranteeing will appear here." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {guaranteesGiven.map((g) => {
                return (
                  <Card key={g.id}>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-sm font-medium">{borrowerName(g.borrowerId)}</CardTitle>
                      <GuaranteeStatusBadge status={g.status} />
                    </CardHeader>
                    <CardContent className="flex flex-col gap-1.5">
                      <p className="text-sm text-muted-foreground">
                        Guaranteed amount: <span className="font-medium text-foreground">{formatRwf(g.amountGuaranteed)}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Remaining balance: <span className="font-medium text-foreground">{formatRwf(g.loanRemainingBalance)}</span>
                      </p>
                      <Button variant="ghost" size="sm" className="mt-1 w-fit -ml-2" render={<Link to={`/member/loans/${g.loanId}`} />}>
                        View loan
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="pt-4">
          <Card>
            <CardContent className="pt-6">
              <DataTable
                columns={[
                  { header: "Borrower", cell: (r) => borrowerName(r.borrowerId) },
                  { header: "Amount", cell: (r) => formatRwf(r.amountGuaranteed) },
                  { header: "Status", cell: (r) => <GuaranteeStatusBadge status={r.status} /> },
                  { header: "Requested", cell: (r) => formatDate(r.requestedDate) },
                  { header: "Responded", cell: (r) => (r.respondedDate ? formatDate(r.respondedDate) : "—") },
                ]}
                rows={myGuarantees}
                rowKey={(r) => r.id}
                emptyMessage="You haven't been asked to guarantee any loans yet."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!pendingAction}
        onOpenChange={(open) => !open && setPendingAction(null)}
        title={pendingAction?.accept ? "Accept this guarantee request?" : "Reject this guarantee request?"}
        description={
          activeAction
            ? `You are ${pendingAction?.accept ? "agreeing" : "declining"} to guarantee ${formatRwf(activeAction.amountGuaranteed)} for ${borrowerName(activeAction.borrowerId)}.`
            : undefined
        }
        confirmLabel={pendingAction?.accept ? "Accept guarantee" : "Reject guarantee"}
        tone={pendingAction?.accept ? "default" : "destructive"}
        onConfirm={() => {
          if (pendingAction) {
            respondGuarantee.mutate({ id: pendingAction.guaranteeId, accept: pendingAction.accept });
          }
        }}
      />
    </div>
  );
}
