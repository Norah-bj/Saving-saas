import type { SavingsTransaction } from "@/lib/types";

export function monthlySeriesFromLedger(
  ledger: SavingsTransaction[],
  months = 8
): { month: string; balance: number }[] {
  const byMonth = new Map<string, { label: string; balance: number; sortKey: string }>();
  for (const tx of ledger) {
    const d = new Date(tx.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const label = d.toLocaleDateString("en-RW", { month: "short", year: "2-digit" });
    byMonth.set(key, { label, balance: tx.balanceAfter, sortKey: key });
  }
  const entries = Array.from(byMonth.values());
  return entries.slice(-months).map((e) => ({ month: e.label, balance: e.balance }));
}
