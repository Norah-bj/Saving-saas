import * as React from "react";
import { Landmark, Coins, PlusCircle, MinusCircle } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/shared/chart-card";
import { TrendLineChart } from "@/components/charts/trend-line-chart";
import { DataTable } from "@/components/shared/data-table";
import { RequestStatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { useDataStore } from "@/lib/store/data-store";
import { formatDate, formatRwf } from "@/lib/format";

export default function MemberSharesPage() {
  const { user } = useCurrentUser();
  const shareHoldings = useDataStore((s) => s.shareHoldings);
  const savingsLedger = useDataStore((s) => s.savingsLedger);
  const shareWithdrawals = useDataStore((s) => s.shareWithdrawals);
  const buyShares = useDataStore((s) => s.buyShares);
  const requestShareWithdrawal = useDataStore((s) => s.requestShareWithdrawal);

  const [buyCount, setBuyCount] = React.useState<number>(1);
  const [buyMsg, setBuyMsg] = React.useState(false);
  const [withdrawCount, setWithdrawCount] = React.useState<number>(1);
  const [withdrawMsg, setWithdrawMsg] = React.useState(false);

  if (!user) return null;

  const holding = shareHoldings[user.id] ?? { memberId: user.id, totalShares: 0, shareValue: 5000 };
  const shareValue = holding.shareValue;
  const totalValue = holding.totalShares * shareValue;

  const ledger = savingsLedger[user.id] ?? [];
  const sharePurchases = ledger.filter((t) => t.type === "share-purchase");

  const byMonth = new Map<string, { label: string; sortKey: string; sharesAdded: number }>();
  for (const tx of sharePurchases) {
    const d = new Date(tx.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const label = d.toLocaleDateString("en-RW", { month: "short", year: "2-digit" });
    const existing = byMonth.get(key);
    const sharesInTx = Math.round(tx.amount / (shareValue || 5000));
    byMonth.set(key, { label, sortKey: key, sharesAdded: (existing?.sharesAdded ?? 0) + sharesInTx });
  }
  const sortedMonths = Array.from(byMonth.values()).sort((a, b) => (a.sortKey < b.sortKey ? -1 : 1));
  let cumulative = Math.max(0, holding.totalShares - sortedMonths.reduce((s, m) => s + m.sharesAdded, 0));
  const series = sortedMonths.map((m) => {
    cumulative += m.sharesAdded;
    return { month: m.label, shares: cumulative };
  });
  if (series.length === 0) {
    series.push({ month: "Now", shares: holding.totalShares });
  }

  const myWithdrawals = shareWithdrawals.filter((w) => w.memberId === user.id);

  function handleBuy(e: React.FormEvent) {
    e.preventDefault();
    if (!user || buyCount <= 0) return;
    buyShares(user.id, buyCount, user.fullName);
    setBuyMsg(true);
    setBuyCount(1);
    setTimeout(() => setBuyMsg(false), 3000);
  }

  function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    if (!user || withdrawCount <= 0 || withdrawCount > holding.totalShares) return;
    requestShareWithdrawal(user.id, withdrawCount);
    setWithdrawMsg(true);
    setWithdrawCount(1);
    setTimeout(() => setWithdrawMsg(false), 3000);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Shares</h1>
        <p className="text-sm text-muted-foreground">
          Manage your cooperative shareholding. Each share is valued at {formatRwf(shareValue)}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Total Shares" value={`${holding.totalShares} shares`} icon={Landmark} description={`${formatRwf(shareValue)} per share`} />
        <StatCard label="Share Value" value={formatRwf(totalValue)} icon={Coins} description="Total holding value" />
      </div>

      <ChartCard title="Share Growth" description="Cumulative shares held over time">
        <TrendLineChart
          data={series}
          xKey="month"
          series={[{ key: "shares", label: "Shares", color: "var(--chart-2)" }]}
          valueFormatter={(v) => `${v}`}
        />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Buy Shares</CardTitle>
            <CardDescription>Purchase additional shares in whole-share increments.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBuy} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="buy-shares">Number of shares</Label>
                <Input
                  id="buy-shares"
                  type="number"
                  min={1}
                  step={1}
                  value={buyCount}
                  onChange={(e) => setBuyCount(Math.max(0, Math.round(e.target.valueAsNumber || 0)))}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Cost preview: <span className="font-medium text-foreground">{formatRwf(buyCount * shareValue)}</span>
              </p>
              <Button type="submit" className="w-fit" disabled={buyCount <= 0}>
                <PlusCircle className="size-4" /> Buy {buyCount > 0 ? `${buyCount} share${buyCount > 1 ? "s" : ""}` : "shares"}
              </Button>
              {buyMsg && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  Purchase recorded and added to your savings ledger.
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Request Share Withdrawal</CardTitle>
            <CardDescription>Requests are reviewed by the Organization Admin.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleWithdraw} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="withdraw-shares">Number of shares</Label>
                <Input
                  id="withdraw-shares"
                  type="number"
                  min={1}
                  max={holding.totalShares}
                  step={1}
                  value={withdrawCount}
                  onChange={(e) => setWithdrawCount(Math.max(0, Math.round(e.target.valueAsNumber || 0)))}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Value preview: <span className="font-medium text-foreground">{formatRwf(withdrawCount * shareValue)}</span>
                {" · "}You hold {holding.totalShares} shares.
              </p>
              <Button
                type="submit"
                variant="outline"
                className="w-fit"
                disabled={withdrawCount <= 0 || withdrawCount > holding.totalShares}
              >
                <MinusCircle className="size-4" /> Request withdrawal
              </Button>
              {withdrawMsg && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  Withdrawal request submitted for approval.
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">My Withdrawal Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: "Requested", cell: (r) => formatDate(r.requestedDate) },
              { header: "Shares", cell: (r) => r.shares },
              { header: "Amount", cell: (r) => formatRwf(r.amount) },
              { header: "Status", cell: (r) => <RequestStatusBadge status={r.status} /> },
              { header: "Decided", cell: (r) => (r.decidedDate ? formatDate(r.decidedDate) : "—") },
            ]}
            rows={myWithdrawals}
            rowKey={(r) => r.id}
            emptyMessage="No share withdrawal requests yet."
          />
        </CardContent>
      </Card>
    </div>
  );
}
