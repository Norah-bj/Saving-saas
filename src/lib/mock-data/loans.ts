import type { Guarantee, Loan, LoanStatus, LoanTimelineEvent } from "@/lib/types";
import { calculateLoan, riskScoreFor } from "@/lib/loan-calculator";
import { MEMBERS_BY_ID } from "./people";
import { MOCK_TODAY, currentSavingsBalance, monthsBetween } from "./financials";

function addDays(iso: string, delta: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

const COMMITTEE_CHAIR = "Emmanuel Nsengimana";
const COMMITTEE_MEMBER = "Alice Mukamana";
const ACCOUNTANT = "Marie Claire Uwase";
const SECRETARY = "Jean Baptiste Habimana";

interface LoanSeed {
  id: string;
  contractNumber: string;
  memberId: string;
  amount: number;
  purpose: string;
  periodMonths: number;
  status: LoanStatus;
  appliedDaysAgo: number;
  guarantorIds?: string[];
  guaranteeStatus?: "pending" | "accepted";
  committeeNotes?: string;
  installmentsPaid?: number;
  approvedDaysAgo?: number;
  disbursedDaysAgo?: number;
}

const SEED: LoanSeed[] = [
  {
    id: "loan-001",
    contractNumber: "APK-2026-101",
    memberId: "u-nkurunziza",
    amount: 600000,
    purpose: "Home renovation",
    periodMonths: 12,
    status: "submitted",
    appliedDaysAgo: 3,
  },
  {
    id: "loan-002",
    contractNumber: "APK-2026-102",
    memberId: "u-nyiraneza",
    amount: 2200000,
    purpose: "Medical expenses — family surgery",
    periodMonths: 18,
    status: "under-review",
    appliedDaysAgo: 6,
  },
  {
    id: "loan-003",
    contractNumber: "APK-2026-103",
    memberId: "u-mugisha",
    amount: 2000000,
    purpose: "Small business — agro-input shop",
    periodMonths: 24,
    status: "guarantor-approval",
    appliedDaysAgo: 10,
    guarantorIds: ["u-uwamahoro"],
    guaranteeStatus: "pending",
  },
  {
    id: "loan-004",
    contractNumber: "APK-2026-104",
    memberId: "u-uwimana",
    amount: 1800000,
    purpose: "Children's school fees",
    periodMonths: 12,
    status: "committee-review",
    appliedDaysAgo: 14,
    guarantorIds: ["u-nzeyimana"],
    guaranteeStatus: "accepted",
  },
  {
    id: "loan-005",
    contractNumber: "APK-2026-105",
    memberId: "u-hakizimana",
    amount: 1200000,
    purpose: "Motorcycle purchase",
    periodMonths: 12,
    status: "approved",
    appliedDaysAgo: 20,
    approvedDaysAgo: 2,
  },
  {
    id: "loan-006",
    contractNumber: "APK-2026-106",
    memberId: "u-mukandayisenga",
    amount: 900000,
    purpose: "Household appliances",
    periodMonths: 10,
    status: "contract-generated",
    appliedDaysAgo: 25,
    approvedDaysAgo: 5,
  },
  {
    id: "loan-007",
    contractNumber: "APK-2026-107",
    memberId: "u-niyonzima",
    amount: 1000000,
    purpose: "Farm inputs & irrigation equipment",
    periodMonths: 12,
    status: "disbursed",
    appliedDaysAgo: 40,
    approvedDaysAgo: 10,
    disbursedDaysAgo: 3,
  },
  {
    id: "loan-008",
    contractNumber: "APK-2026-062",
    memberId: "u-mukeshimana",
    amount: 1500000,
    purpose: "Land purchase deposit",
    periodMonths: 24,
    status: "repaying",
    appliedDaysAgo: 150,
    approvedDaysAgo: 140,
    disbursedDaysAgo: 120,
    guarantorIds: ["u-habyarimana"],
    guaranteeStatus: "accepted",
    installmentsPaid: 5,
  },
  {
    id: "loan-009",
    contractNumber: "APK-2025-044",
    memberId: "u-ntawukuriryayo",
    amount: 700000,
    purpose: "Wedding expenses",
    periodMonths: 12,
    status: "completed",
    appliedDaysAgo: 400,
    approvedDaysAgo: 390,
    disbursedDaysAgo: 380,
    installmentsPaid: 12,
  },
  {
    id: "loan-010",
    contractNumber: "APK-2026-058",
    memberId: "u-umutoni",
    amount: 4000000,
    purpose: "Business expansion — retail stock",
    periodMonths: 36,
    status: "rejected",
    appliedDaysAgo: 60,
    committeeNotes:
      "Requested amount far exceeds savings capacity and no guarantor was secured within the review window. Member advised to reapply with a guarantor or a reduced amount.",
  },
  {
    id: "loan-011",
    contractNumber: "APK-2025-071",
    memberId: "u-bizimana",
    amount: 1100000,
    purpose: "Solar home system",
    periodMonths: 12,
    status: "repaying",
    appliedDaysAgo: 200,
    approvedDaysAgo: 190,
    disbursedDaysAgo: 180,
    installmentsPaid: 8,
  },
];

function buildTimeline(seed: LoanSeed): LoanTimelineEvent[] {
  const events: LoanTimelineEvent[] = [
    {
      stage: "submitted",
      date: addDays(MOCK_TODAY, -seed.appliedDaysAgo),
      officer: MEMBERS_BY_ID[seed.memberId]?.fullName ?? "Member",
      notes: "Loan application submitted for review.",
    },
  ];

  const reviewDay = -seed.appliedDaysAgo + 1;
  if (seed.status !== "submitted") {
    events.push({
      stage: "under-review",
      date: addDays(MOCK_TODAY, reviewDay),
      officer: SECRETARY,
      notes: "Application checked against membership and savings records.",
    });
  }

  if (seed.status === "rejected") {
    events.push({
      stage: "committee-review",
      date: addDays(MOCK_TODAY, reviewDay + 5),
      officer: COMMITTEE_CHAIR,
      notes: "Reviewed by Loan Committee.",
    });
    events.push({
      stage: "rejected",
      date: addDays(MOCK_TODAY, reviewDay + 6),
      officer: COMMITTEE_CHAIR,
      notes: seed.committeeNotes,
    });
    return events;
  }

  const order: LoanStatus[] = [
    "guarantor-approval",
    "committee-review",
    "approved",
    "contract-generated",
    "disbursed",
    "repaying",
    "completed",
  ];
  const currentIndex = order.indexOf(seed.status);

  if (seed.guarantorIds?.length) {
    events.push({
      stage: "guarantor-approval",
      date: addDays(MOCK_TODAY, reviewDay + 1),
      officer: `Guarantor: ${MEMBERS_BY_ID[seed.guarantorIds[0]]?.fullName ?? ""}`,
      notes:
        seed.guaranteeStatus === "accepted"
          ? "Guarantor accepted the request."
          : "Awaiting guarantor response.",
    });
  }

  if (currentIndex >= order.indexOf("committee-review")) {
    events.push({
      stage: "committee-review",
      date: addDays(MOCK_TODAY, reviewDay + 3),
      officer: COMMITTEE_MEMBER,
      notes: "Savings, salary and guarantor analysis completed by committee.",
    });
  }
  if (currentIndex >= order.indexOf("approved")) {
    events.push({
      stage: "approved",
      date: addDays(MOCK_TODAY, -(seed.approvedDaysAgo ?? seed.appliedDaysAgo - 4)),
      officer: COMMITTEE_CHAIR,
      notes: "Approved by Loan Committee.",
    });
  }
  if (currentIndex >= order.indexOf("contract-generated")) {
    events.push({
      stage: "contract-generated",
      date: addDays(MOCK_TODAY, -(seed.approvedDaysAgo ?? 1) + 1),
      officer: ACCOUNTANT,
      notes: "Loan agreement generated and signed by all parties.",
    });
  }
  if (currentIndex >= order.indexOf("disbursed")) {
    events.push({
      stage: "disbursed",
      date: addDays(MOCK_TODAY, -(seed.disbursedDaysAgo ?? 0)),
      officer: ACCOUNTANT,
      notes: "Funds disbursed to member's account.",
    });
  }
  if (currentIndex >= order.indexOf("repaying")) {
    events.push({
      stage: "repaying",
      date: addDays(MOCK_TODAY, -(seed.disbursedDaysAgo ?? 0) + 30),
      officer: ACCOUNTANT,
      notes: "Monthly salary deductions in progress.",
    });
  }
  if (currentIndex >= order.indexOf("completed")) {
    events.push({
      stage: "completed",
      date: addDays(MOCK_TODAY, -5),
      officer: ACCOUNTANT,
      notes: "Loan fully repaid. Contract closed.",
    });
  }

  return events;
}

export const LOANS: Loan[] = SEED.map((seed) => {
  const savings = currentSavingsBalance(seed.memberId);
  const calc = calculateLoan(seed.amount, savings, seed.periodMonths);
  const member = MEMBERS_BY_ID[seed.memberId];
  const tenureMonths = member
    ? monthsBetween(member.dateJoined, MOCK_TODAY)
    : 0;

  const paid = seed.installmentsPaid ?? 0;
  const remainingBalance =
    seed.status === "completed"
      ? 0
      : seed.status === "repaying" || seed.status === "disbursed"
        ? Math.max(0, calc.totalPayable - paid * calc.monthlyInstallment)
        : calc.totalPayable;

  const riskScore = riskScoreFor({
    amount: seed.amount,
    savings,
    monthsAsMember: tenureMonths,
    hasGuarantors: seed.guaranteeStatus === "accepted",
    salary: member?.monthlySalary ?? 0,
    monthlyInstallment: calc.monthlyInstallment,
  });

  return {
    id: seed.id,
    contractNumber: seed.contractNumber,
    memberId: seed.memberId,
    amount: seed.amount,
    purpose: seed.purpose,
    periodMonths: seed.periodMonths,
    interestRate: 5,
    insuranceRequired: calc.guarantorRequired,
    insuranceFee: calc.insuranceFee,
    monthlyInstallment: calc.monthlyInstallment,
    totalPayable: calc.totalPayable,
    remainingBalance,
    status: seed.status,
    guarantorIds: seed.guarantorIds ?? [],
    appliedDate: addDays(MOCK_TODAY, -seed.appliedDaysAgo),
    approvedDate: seed.approvedDaysAgo
      ? addDays(MOCK_TODAY, -seed.approvedDaysAgo)
      : undefined,
    disbursedDate: seed.disbursedDaysAgo
      ? addDays(MOCK_TODAY, -seed.disbursedDaysAgo)
      : undefined,
    riskScore,
    committeeNotes: seed.committeeNotes,
    timeline: buildTimeline(seed),
  };
});

export const LOANS_BY_ID: Record<string, Loan> = Object.fromEntries(
  LOANS.map((l) => [l.id, l])
);

export const GUARANTEES: Guarantee[] = SEED.filter((s) => s.guarantorIds?.length).map(
  (s, idx) => ({
    id: `guar-${idx + 1}`,
    loanId: s.id,
    borrowerId: s.memberId,
    guarantorId: s.guarantorIds![0],
    amountGuaranteed: s.amount,
    status: s.guaranteeStatus === "accepted" ? "accepted" : "pending",
    requestedDate: addDays(MOCK_TODAY, -s.appliedDaysAgo + 1),
    respondedDate:
      s.guaranteeStatus === "accepted"
        ? addDays(MOCK_TODAY, -s.appliedDaysAgo + 2)
        : undefined,
  })
);
