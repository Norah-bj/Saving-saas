"use client";

import * as React from "react";
import Link from "next/link";
import { PiggyBank, Wallet, Landmark, TrendingUp, FileText, PlusCircle } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/shared/chart-card";
import { TrendLineChart } from "@/components/charts/trend-line-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { useDataStore } from "@/lib/store/data-store";
import { formatRwf } from "@/lib/format";
import { monthlySeriesFromLedger } from "@/lib/chart-utils";

export default function MemberSavingsPage() {
  const { user } = useCurrentUser();
  const savingsLedger = useDataStore((s) => s.savingsLedger);
  const addVoluntarySaving = useDataStore((s) => s.addVoluntarySaving);

  const [amount, setAmount] = React.useState<number>(10000);
  const [submitted, setSubmitted] = React.useState(false);

  if (!user) return null;

  const ledger = savingsLedger[user.id] ?? [];
  const balance = ledger.length ? ledger[ledger.length - 1].balanceAfter : 0;

  const salaryTotal = ledger
    .filter((t) => t.type === "salary-deduction")
    .reduce((sum, t) => sum + t.amount, 0);
  const voluntaryTotal = ledger
    .filter((t) => t.type === "voluntary")
    .reduce((sum, t) => sum + t.amount, 0);
  const sharesTotal = ledger
    .filter((t) => t.type === "share-purchase")
    .reduce((sum, t) => sum + t.amount, 0);

  const series = monthlySeriesFromLedger(ledger, 8);

  const breakdown = [
    { key: "salary", label: "Salary Deduction", value: salaryTotal, color: "var(--chart-1)" },
    { key: "voluntary", label: "Voluntary Savings", value: voluntaryTotal, color: "var(--chart-2)" },
    { key: "shares", label: "Share Purchases", value: sharesTotal, color: "var(--chart-3)" },
  ].filter((d) => d.value > 0);

  function handleDeposit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || amount <= 0) return;
    addVoluntarySaving(user.id, amount, user.fullName);
    setSubmitted(true);
    setAmount(10000);
    setTimeout(() => setSubmitted(false), 3000);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Savings</h1>
          <p className="text-sm text-muted-foreground">
            An overview of your savings balance, contribution sources and growth over time.
          </p>
        </div>
        <Button variant="outline" size="sm" render={<Link href="/member/savings/statement" />}>
          <FileText className="size-3.5" /> View full statement
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Savings Balance" value={formatRwf(balance)} icon={PiggyBank} description="All-time balance" />
        <StatCard label="Salary Deductions" value={formatRwf(salaryTotal)} icon={Wallet} description="From payroll" />
        <StatCard label="Voluntary Savings" value={formatRwf(voluntaryTotal)} icon={TrendingUp} description="Self-service deposits" />
        <StatCard label="Share Purchases" value={formatRwf(sharesTotal)} icon={Landmark} description="Contributed to shares" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Savings Growth" description="Balance over the last 8 months" className="lg:col-span-2">
          <TrendLineChart
            data={series}
            xKey="month"
            series={[{ key: "balance", label: "Savings Balance", color: "var(--chart-1)" }]}
            valueFormatter={(v) => `${Math.round(v / 1000)}k`}
          />
        </ChartCard>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Contribution Breakdown</CardTitle>
            <CardDescription>By source, all-time</CardDescription>
          </CardHeader>
          <CardContent>
            {breakdown.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No contributions recorded yet.</p>
            ) : (
              <>
                <DonutChart data={breakdown} centerValue={formatRwf(balance)} centerLabel="Total" />
                <div className="mt-4 flex flex-col gap-2">
                  {breakdown.map((d) => (
                    <div key={d.key} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        {d.label}
                      </span>
                      <span className="font-medium">{formatRwf(d.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Make a Voluntary Deposit</CardTitle>
          <CardDescription>Add extra savings on top of your monthly payroll deduction.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleDeposit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deposit-amount">Amount (RWF)</Label>
              <Input
                id="deposit-amount"
                type="number"
                min={1000}
                step={1000}
                value={amount}
                onChange={(e) => setAmount(e.target.valueAsNumber || 0)}
              />
            </div>
            <Button type="submit" className="w-fit" disabled={amount <= 0}>
              <PlusCircle className="size-4" /> Deposit {amount > 0 ? formatRwf(amount) : ""}
            </Button>
            {submitted && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                Deposit recorded. Your new balance reflects immediately in your statement.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
