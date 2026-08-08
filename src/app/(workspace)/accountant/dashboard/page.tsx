"use client";

import { PiggyBank, Landmark, TrendingUp, Percent } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/shared/chart-card";
import { TrendLineChart } from "@/components/charts/trend-line-chart";
import { BarComparisonChart } from "@/components/charts/bar-comparison-chart";
import { useDataStore } from "@/lib/store/data-store";
import { formatRwf } from "@/lib/format";
import { MOCK_TODAY } from "@/lib/mock-data";

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
}

function monthLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-RW", { month: "short", year: "2-digit" });
}

function lastMonths(count: number) {
  const today = new Date(MOCK_TODAY);
  const months: { key: string; label: string; endOfMonth: Date }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-RW", { month: "short", year: "2-digit" }),
      endOfMonth,
    });
  }
  return months;
}

export default function AccountantDashboardPage() {
  const organization = useDataStore((s) => s.organization);
  const members = useDataStore((s) => s.members);
  const loans = useDataStore((s) => s.loans);
  const savingsLedger = useDataStore((s) => s.savingsLedger);
  const savingsBalance = useDataStore((s) => s.savingsBalance);
  const ledgerTransactions = useDataStore((s) => s.ledgerTransactions);

  const orgMembers = members.filter((m) => m.organizationId === organization.id);
  const orgMemberIds = new Set(orgMembers.map((m) => m.id));

  const totalOrgSavings = orgMembers.reduce((sum, m) => sum + savingsBalance(m.id), 0);

  const totalActiveLoanPortfolio = loans
    .filter((l) => l.status === "disbursed" || l.status === "repaying")
    .reduce((sum, l) => sum + l.remainingBalance, 0);

  const currentMonthKey = monthKey(MOCK_TODAY);
  const thisMonthContributions = orgMembers.reduce((sum, m) => {
    const ledger = savingsLedger[m.id] ?? [];
    return (
      sum +
      ledger
        .filter((tx) => tx.type !== "loan-repayment" && monthKey(tx.date) === currentMonthKey)
        .reduce((s, tx) => s + tx.amount, 0)
    );
  }, 0);

  const totalInterestIncome = ledgerTransactions
    .filter((t) => t.type === "interest-income")
    .reduce((sum, t) => sum + t.amount, 0);

  const months = lastMonths(8);
  const savingsGrowth = months.map((m) => {
    let total = 0;
    for (const memberId of orgMemberIds) {
      const ledger = savingsLedger[memberId] ?? [];
      let balance = 0;
      for (const tx of ledger) {
        if (new Date(tx.date) <= m.endOfMonth) balance = tx.balanceAfter;
        else break;
      }
      total += balance;
    }
    return { month: m.label, balance: total };
  });

  const cashFlow = months.map((m) => {
    const inTypes = new Set([
      "salary-deduction",
      "voluntary",
      "share-purchase",
      "loan-repayment",
      "insurance-fee",
      "interest-income",
    ]);
    const txInMonth = ledgerTransactions.filter((t) => monthKey(t.date) === m.key);
    const moneyIn = txInMonth
      .filter((t) => inTypes.has(t.type))
      .reduce((sum, t) => sum + t.amount, 0);
    const moneyOut = txInMonth
      .filter((t) => t.type === "loan-disbursement-adjustment")
      .reduce((sum, t) => sum + t.amount, 0);
    return { month: m.label, in: moneyIn, out: moneyOut };
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Accountant Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Financial overview for {organization.name}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Org Savings"
          value={formatRwf(totalOrgSavings)}
          icon={PiggyBank}
          description={`${orgMembers.length} members`}
        />
        <StatCard
          label="Active Loan Portfolio"
          value={formatRwf(totalActiveLoanPortfolio)}
          icon={Landmark}
          description="Outstanding balance"
        />
        <StatCard
          label="This Month's Contributions"
          value={formatRwf(thisMonthContributions)}
          icon={TrendingUp}
          description={monthLabel(MOCK_TODAY)}
        />
        <StatCard
          label="Total Interest Income"
          value={formatRwf(totalInterestIncome)}
          icon={Percent}
          description="All-time"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Savings Growth" description="Aggregate org savings over the last 8 months">
          <TrendLineChart
            data={savingsGrowth}
            xKey="month"
            series={[{ key: "balance", label: "Total Savings", color: "var(--chart-1)" }]}
            valueFormatter={(v) => `${Math.round(v / 1000000)}M`}
          />
        </ChartCard>
        <ChartCard title="Cash Flow" description="Money in vs loan disbursements out, by month">
          <BarComparisonChart
            data={cashFlow}
            xKey="month"
            series={[
              { key: "in", label: "Money In", color: "var(--chart-2)" },
              { key: "out", label: "Loan Disbursements", color: "var(--chart-4)" },
            ]}
            valueFormatter={(v) => `${Math.round(v / 1000)}k`}
          />
        </ChartCard>
      </div>
    </div>
  );
}
