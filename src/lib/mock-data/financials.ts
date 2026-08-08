import type { SavingsTransaction, ShareHolding } from "@/lib/types";
import { MEMBERS } from "./people";
import { ORGANIZATION } from "./organization";

export const MOCK_TODAY = "2026-08-01";
export const SHARE_VALUE = 5000;
const STATEMENT_WINDOW_MONTHS = 18;

export function monthsBetween(fromIso: string, toIso: string) {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  return (
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth())
  );
}

function addMonths(iso: string, delta: number) {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + delta, 1);
  return d.toISOString().slice(0, 10);
}

function roundTo(n: number, nearest: number) {
  return Math.round(n / nearest) * nearest;
}

function monthLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-RW", {
    month: "long",
    year: "numeric",
  });
}

let txCounter = 0;
function nextTxId(memberId: string) {
  txCounter += 1;
  return `sv-${memberId}-${txCounter}`;
}

function buildLedgerForMember(memberId: string, salary: number, dateJoined: string) {
  const tenureMonths = Math.max(0, monthsBetween(dateJoined, MOCK_TODAY));
  const windowMonths = Math.min(STATEMENT_WINDOW_MONTHS, tenureMonths);
  const priorMonths = tenureMonths - windowMonths;

  const baseMonthly = roundTo(salary * 0.1, 500);
  const openingBalance = roundTo(priorMonths * baseMonthly * 0.92, 1000);

  const ledger: SavingsTransaction[] = [];
  let balance = openingBalance;
  let shareCount = 5; // every member starts with 5 founding shares

  if (priorMonths > 0) {
    ledger.push({
      id: nextTxId(memberId),
      memberId,
      date: addMonths(MOCK_TODAY, -windowMonths - 1),
      type: "salary-deduction",
      amount: openingBalance,
      balanceAfter: openingBalance,
      description: "Opening balance brought forward",
      source: "Historical contributions",
    });
  }

  const startOffset = -(windowMonths - 1);
  for (let i = startOffset; i <= 0; i++) {
    const monthIso = addMonths(MOCK_TODAY, i);
    const variance = ((i * 137 + memberId.length * 29) % 7) * 500 - 1500;
    const deduction = Math.max(2000, baseMonthly + variance);
    balance += deduction;
    ledger.push({
      id: nextTxId(memberId),
      memberId,
      date: monthIso,
      type: "salary-deduction",
      amount: deduction,
      balanceAfter: balance,
      description: "Monthly salary savings deduction",
      source: `Payroll Import — ${monthLabel(monthIso)}`,
    });

    // Occasional voluntary top-up.
    if ((i + 100) % 4 === 0 && i !== startOffset) {
      const voluntary = roundTo(baseMonthly * 0.4, 500);
      balance += voluntary;
      ledger.push({
        id: nextTxId(memberId),
        memberId,
        date: monthIso,
        type: "voluntary",
        amount: voluntary,
        balanceAfter: balance,
        description: "Voluntary savings top-up",
        source: "Mobile Money Deposit",
      });
    }

    // Occasional share purchase.
    if ((i + 100) % 6 === 0 && i !== startOffset) {
      const shares = 2 + (memberId.length % 3);
      const amount = shares * SHARE_VALUE;
      shareCount += shares;
      balance += amount;
      ledger.push({
        id: nextTxId(memberId),
        memberId,
        date: monthIso,
        type: "share-purchase",
        amount,
        balanceAfter: balance,
        description: `Purchase of ${shares} shares @ ${SHARE_VALUE.toLocaleString()} RWF`,
        source: "Share Capital Purchase",
      });
    }
  }

  return { ledger, closingBalance: balance, shareCount };
}

const ORG_MEMBERS = MEMBERS.filter((m) => m.organizationId === ORGANIZATION.id);

export const SAVINGS_LEDGER: Record<string, SavingsTransaction[]> = {};
export const SHARE_HOLDINGS: Record<string, ShareHolding> = {};
const CLOSING_BALANCE: Record<string, number> = {};

for (const member of ORG_MEMBERS) {
  const { ledger, closingBalance, shareCount } = buildLedgerForMember(
    member.id,
    member.monthlySalary,
    member.dateJoined
  );
  SAVINGS_LEDGER[member.id] = ledger;
  CLOSING_BALANCE[member.id] = closingBalance;
  SHARE_HOLDINGS[member.id] = {
    memberId: member.id,
    totalShares: shareCount,
    shareValue: SHARE_VALUE,
  };
}

export function currentSavingsBalance(memberId: string) {
  return CLOSING_BALANCE[memberId] ?? 0;
}

export function appendLedgerEntry(
  memberId: string,
  entry: Omit<SavingsTransaction, "id" | "balanceAfter"> & { balanceAfter?: number }
) {
  const prevBalance = CLOSING_BALANCE[memberId] ?? 0;
  const balanceAfter =
    entry.balanceAfter ??
    (entry.type === "loan-repayment"
      ? prevBalance
      : prevBalance + entry.amount);
  const tx: SavingsTransaction = {
    id: nextTxId(memberId),
    balanceAfter,
    ...entry,
  };
  SAVINGS_LEDGER[memberId] = [...(SAVINGS_LEDGER[memberId] ?? []), tx];
  CLOSING_BALANCE[memberId] = balanceAfter;
  return tx;
}
