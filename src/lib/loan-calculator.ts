// Loan business rules for IkiminaConnect.
//
// - Interest is always 5% flat, applied once over the full loan amount.
// - Insurance is 1% flat, but ONLY charged when the requested amount exceeds
//   the member's total savings — that's exactly the case that requires a
//   guarantor, so "insurance required" and "guarantor required" are the same
//   condition.
// - Repayments are deducted from salary monthly in equal installments, so
//   there's no late-payment penalty concept.

export const LOAN_INTEREST_RATE = 0.05;
export const LOAN_INSURANCE_RATE = 0.01;
export const MIN_MONTHS_BEFORE_ELIGIBLE = 3;

export interface RepaymentScheduleRow {
  month: number;
  principal: number;
  interest: number;
  installment: number;
  balanceAfter: number;
}

export interface LoanCalculation {
  amount: number;
  guarantorRequired: boolean;
  interest: number;
  insuranceFee: number;
  totalPayable: number;
  monthlyInstallment: number;
  schedule: RepaymentScheduleRow[];
}

export function calculateLoan(
  amount: number,
  memberSavings: number,
  periodMonths: number,
  rates: { interestRate?: number; insuranceRate?: number } = {}
): LoanCalculation {
  const interestRate = rates.interestRate ?? LOAN_INTEREST_RATE;
  const insuranceRate = rates.insuranceRate ?? LOAN_INSURANCE_RATE;
  const guarantorRequired = amount > memberSavings;
  const interest = round(amount * interestRate);
  const insuranceFee = guarantorRequired
    ? round(amount * insuranceRate)
    : 0;
  const totalPayable = amount + interest + insuranceFee;
  const monthlyInstallment =
    periodMonths > 0 ? round(totalPayable / periodMonths) : 0;

  const monthlyPrincipal = periodMonths > 0 ? round(amount / periodMonths) : 0;
  const monthlyInterestPortion =
    periodMonths > 0 ? round((interest + insuranceFee) / periodMonths) : 0;

  const schedule: RepaymentScheduleRow[] = [];
  let balance = totalPayable;
  for (let m = 1; m <= periodMonths; m++) {
    const isLast = m === periodMonths;
    const principal = isLast
      ? amount - monthlyPrincipal * (periodMonths - 1)
      : monthlyPrincipal;
    const interestPortion = isLast
      ? interest + insuranceFee - monthlyInterestPortion * (periodMonths - 1)
      : monthlyInterestPortion;
    const installment = isLast ? balance : monthlyInstallment;
    balance = round(balance - installment);
    schedule.push({
      month: m,
      principal: round(principal),
      interest: round(interestPortion),
      installment: round(installment),
      balanceAfter: Math.max(0, balance),
    });
  }

  return {
    amount,
    guarantorRequired,
    interest,
    insuranceFee,
    totalPayable: round(totalPayable),
    monthlyInstallment,
    schedule,
  };
}

export function riskScoreFor(params: {
  amount: number;
  savings: number;
  monthsAsMember: number;
  hasGuarantors: boolean;
  salary: number;
  monthlyInstallment: number;
}): number {
  const { amount, savings, monthsAsMember, hasGuarantors, salary, monthlyInstallment } =
    params;
  let score = 100;

  const savingsRatio = savings > 0 ? amount / savings : amount > 0 ? 5 : 0;
  if (savingsRatio > 3) score -= 35;
  else if (savingsRatio > 2) score -= 20;
  else if (savingsRatio > 1) score -= 10;

  if (monthsAsMember < MIN_MONTHS_BEFORE_ELIGIBLE) score -= 30;
  else if (monthsAsMember < 12) score -= 10;

  if (amount > savings && !hasGuarantors) score -= 25;

  const dsr = salary > 0 ? monthlyInstallment / salary : 1;
  if (dsr > 0.5) score -= 25;
  else if (dsr > 0.35) score -= 12;

  return Math.max(5, Math.min(100, Math.round(score)));
}

export function riskBand(score: number): {
  label: "Low Risk" | "Moderate Risk" | "High Risk";
  tone: "success" | "warning" | "destructive";
} {
  if (score >= 75) return { label: "Low Risk", tone: "success" };
  if (score >= 50) return { label: "Moderate Risk", tone: "warning" };
  return { label: "High Risk", tone: "destructive" };
}

function round(n: number) {
  return Math.round(n);
}
