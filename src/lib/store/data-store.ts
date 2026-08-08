import { create } from "zustand";
import type {
  Announcement,
  AppNotification,
  AppUser,
  DocumentItem,
  ExitRequest,
  Guarantee,
  Loan,
  LoanStatus,
  Meeting,
  MemberStatus,
  Organization,
  PayrollImportRecord,
  PayrollImportSummary,
  Role,
  SavingsTransaction,
  ShareHolding,
  ShareWithdrawalRequest,
} from "@/lib/types";
import { calculateLoan, riskScoreFor } from "@/lib/loan-calculator";
import {
  ANNOUNCEMENTS,
  AUDIT_LOGS,
  BACKUPS,
  DOCUMENTS,
  EMPLOYEE_REGISTRY,
  EXIT_REQUESTS,
  GUARANTEES,
  LEDGER_TRANSACTIONS,
  LOANS,
  MEETINGS,
  MEMBERS,
  MOCK_TODAY,
  NOTIFICATIONS,
  ORGANIZATION,
  PAYROLL_IMPORTS,
  PLATFORM_ORGANIZATIONS,
  POLICIES,
  SAVINGS_LEDGER,
  SHARE_HOLDINGS,
  SHARE_WITHDRAWALS,
  monthsBetween,
} from "@/lib/mock-data";
import type { AuditLogEntry, BackupRecord, LedgerTransaction, RolePolicy } from "@/lib/types";

function clone<T>(v: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(v)
    : JSON.parse(JSON.stringify(v));
}

let seq = 1000;
function nextId(prefix: string) {
  seq += 1;
  return `${prefix}-${seq}`;
}

interface DataState {
  organization: Organization;
  organizations: Organization[];
  members: AppUser[];
  loans: Loan[];
  guarantees: Guarantee[];
  savingsLedger: Record<string, SavingsTransaction[]>;
  shareHoldings: Record<string, ShareHolding>;
  meetings: Meeting[];
  announcements: Announcement[];
  documents: DocumentItem[];
  ledgerTransactions: LedgerTransaction[];
  payrollImports: PayrollImportSummary[];
  auditLogs: AuditLogEntry[];
  backups: BackupRecord[];
  policies: RolePolicy[];
  exitRequests: ExitRequest[];
  shareWithdrawals: ShareWithdrawalRequest[];
  employeeRegistry: typeof EMPLOYEE_REGISTRY;
  notifications: AppNotification[];

  // --- derived helpers ---
  savingsBalance: (memberId: string) => number;
  memberLoans: (memberId: string) => Loan[];

  // --- actions ---
  applyForLoan: (
    memberId: string,
    input: { amount: number; purpose: string; periodMonths: number; guarantorId?: string }
  ) => Loan;
  startLoanReview: (loanId: string, actorName: string) => void;
  respondGuarantee: (guaranteeId: string, accept: boolean, actorName: string) => void;
  committeeDecision: (
    loanId: string,
    decision: "approve" | "reject",
    actorName: string,
    notes?: string
  ) => void;
  generateContract: (loanId: string, actorName: string) => void;
  disburseLoan: (loanId: string, actorName: string) => void;
  recordRepayment: (loanId: string, actorName: string) => void;
  buyShares: (memberId: string, shares: number, actorName: string) => void;
  addVoluntarySaving: (memberId: string, amount: number, actorName: string) => void;
  importPayroll: (
    records: { employeeId: string; amount: number }[],
    fileName: string,
    actorName: string
  ) => { summary: PayrollImportSummary; rows: PayrollImportRecord[] };
  addMember: (
    input: {
      nationalId: string;
      employeeId: string;
      fullName: string;
      email: string;
      phone: string;
      department: string;
      position: string;
      monthlySalary: number;
    },
    actorName: string
  ) => AppUser;
  setMemberStatus: (memberId: string, status: MemberStatus, actorName: string) => void;
  createMeeting: (
    input: Omit<Meeting, "id" | "status" | "attendeeIds" | "createdBy">,
    actorName: string
  ) => void;
  createAnnouncement: (
    input: Omit<Announcement, "id" | "date" | "author">,
    actorName: string
  ) => void;
  addDocument: (
    input: Omit<DocumentItem, "id" | "uploadedDate" | "uploadedBy">,
    actorName: string
  ) => void;
  decideExitRequest: (id: string, decision: "approve" | "reject", actorName: string) => void;
  decideShareWithdrawal: (id: string, decision: "approve" | "reject", actorName: string) => void;
  requestExit: (memberId: string, reason: string) => void;
  requestShareWithdrawal: (memberId: string, shares: number) => void;
  logAudit: (actor: string, action: string, target: string) => void;
  createBackup: (label: string, organizationId: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (userId: string) => void;
  setMemberRoles: (memberId: string, roles: Role[], actorName: string) => void;
  updateOrganization: (patch: Partial<Organization>, actorName: string) => void;
  setOrganizationStatus: (
    organizationId: string,
    status: Organization["status"],
    actorName: string
  ) => void;
  setOrganizationPlan: (
    organizationId: string,
    plan: Organization["plan"],
    actorName: string
  ) => void;
  updateMeeting: (id: string, patch: Partial<Meeting>) => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  organization: clone(ORGANIZATION),
  organizations: clone(PLATFORM_ORGANIZATIONS),
  members: clone(MEMBERS),
  loans: clone(LOANS),
  guarantees: clone(GUARANTEES),
  savingsLedger: clone(SAVINGS_LEDGER),
  shareHoldings: clone(SHARE_HOLDINGS),
  meetings: clone(MEETINGS),
  announcements: clone(ANNOUNCEMENTS),
  documents: clone(DOCUMENTS),
  ledgerTransactions: clone(LEDGER_TRANSACTIONS),
  payrollImports: clone(PAYROLL_IMPORTS),
  auditLogs: clone(AUDIT_LOGS),
  backups: clone(BACKUPS),
  policies: clone(POLICIES),
  exitRequests: clone(EXIT_REQUESTS),
  shareWithdrawals: clone(SHARE_WITHDRAWALS),
  employeeRegistry: clone(EMPLOYEE_REGISTRY),
  notifications: clone(NOTIFICATIONS),

  savingsBalance: (memberId) => {
    const ledger = get().savingsLedger[memberId] ?? [];
    return ledger.length ? ledger[ledger.length - 1].balanceAfter : 0;
  },

  memberLoans: (memberId) => get().loans.filter((l) => l.memberId === memberId),

  logAudit: (actor, action, target) =>
    set((s) => ({
      auditLogs: [
        {
          id: nextId("aud"),
          actor,
          action,
          target,
          date: MOCK_TODAY,
          organizationId: s.organization.id,
        },
        ...s.auditLogs,
      ],
    })),

  applyForLoan: (memberId, input) => {
    const savings = get().savingsBalance(memberId);
    const calc = calculateLoan(input.amount, savings, input.periodMonths);
    const member = get().members.find((m) => m.id === memberId);
    const tenureMonths = member ? monthsBetween(member.dateJoined, MOCK_TODAY) : 0;
    const riskScore = riskScoreFor({
      amount: input.amount,
      savings,
      monthsAsMember: tenureMonths,
      hasGuarantors: !!input.guarantorId,
      salary: member?.monthlySalary ?? 0,
      monthlyInstallment: calc.monthlyInstallment,
    });

    const loan: Loan = {
      id: nextId("loan"),
      contractNumber: `APK-2026-${nextId("c").split("-")[1]}`,
      memberId,
      amount: input.amount,
      purpose: input.purpose,
      periodMonths: input.periodMonths,
      interestRate: 5,
      insuranceRequired: calc.guarantorRequired,
      insuranceFee: calc.insuranceFee,
      monthlyInstallment: calc.monthlyInstallment,
      totalPayable: calc.totalPayable,
      remainingBalance: calc.totalPayable,
      status: "submitted",
      guarantorIds: input.guarantorId ? [input.guarantorId] : [],
      appliedDate: MOCK_TODAY,
      riskScore,
      timeline: [
        {
          stage: "submitted",
          date: MOCK_TODAY,
          officer: member?.fullName ?? "Member",
          notes: "Loan application submitted for review.",
        },
      ],
    };

    set((s) => ({ loans: [loan, ...s.loans] }));

    if (calc.guarantorRequired && input.guarantorId) {
      set((s) => ({
        guarantees: [
          ...s.guarantees,
          {
            id: nextId("guar"),
            loanId: loan.id,
            borrowerId: memberId,
            guarantorId: input.guarantorId!,
            amountGuaranteed: input.amount,
            status: "pending",
            requestedDate: MOCK_TODAY,
          },
        ],
      }));
    }

    get().logAudit(member?.fullName ?? "Member", "Applied for loan", loan.contractNumber);
    return loan;
  },

  startLoanReview: (loanId, actorName) =>
    set((s) => ({
      loans: s.loans.map((l) => {
        if (l.id !== loanId) return l;
        if (l.status !== "submitted" && l.status !== "under-review") return l;
        const nextStatus: LoanStatus = l.insuranceRequired
          ? "guarantor-approval"
          : "committee-review";
        return {
          ...l,
          status: nextStatus,
          timeline: [
            ...l.timeline,
            { stage: "under-review", date: MOCK_TODAY, officer: actorName, notes: "Application reviewed against membership and savings records." },
            {
              stage: nextStatus,
              date: MOCK_TODAY,
              officer: actorName,
              notes:
                nextStatus === "guarantor-approval"
                  ? "Awaiting guarantor response."
                  : "Forwarded to Loan Committee for review.",
            },
          ],
        };
      }),
    })),

  respondGuarantee: (guaranteeId, accept, actorName) => {
    const guarantee = get().guarantees.find((g) => g.id === guaranteeId);
    if (!guarantee) return;
    set((s) => ({
      guarantees: s.guarantees.map((g) =>
        g.id === guaranteeId
          ? { ...g, status: accept ? "accepted" : "rejected", respondedDate: MOCK_TODAY }
          : g
      ),
      loans: s.loans.map((l) => {
        if (l.id !== guarantee.loanId) return l;
        if (accept) {
          return {
            ...l,
            status: "committee-review",
            timeline: [
              ...l.timeline,
              { stage: "guarantor-approval", date: MOCK_TODAY, officer: actorName, notes: "Guarantor accepted the request." },
              { stage: "committee-review", date: MOCK_TODAY, officer: actorName, notes: "Forwarded to Loan Committee for review." },
            ],
          };
        }
        return {
          ...l,
          status: "rejected",
          committeeNotes: "Guarantor declined the request.",
          timeline: [
            ...l.timeline,
            { stage: "rejected", date: MOCK_TODAY, officer: actorName, notes: "Guarantor declined the request." },
          ],
        };
      }),
    }));
    get().logAudit(actorName, accept ? "Accepted guarantee request" : "Declined guarantee request", guarantee.loanId);
  },

  committeeDecision: (loanId, decision, actorName, notes) =>
    set((s) => ({
      loans: s.loans.map((l) => {
        if (l.id !== loanId) return l;
        if (decision === "approve") {
          return {
            ...l,
            status: "approved",
            approvedDate: MOCK_TODAY,
            committeeNotes: notes,
            timeline: [
              ...l.timeline,
              { stage: "approved", date: MOCK_TODAY, officer: actorName, notes: notes || "Approved by Loan Committee." },
            ],
          };
        }
        return {
          ...l,
          status: "rejected",
          committeeNotes: notes,
          timeline: [
            ...l.timeline,
            { stage: "rejected", date: MOCK_TODAY, officer: actorName, notes: notes || "Rejected by Loan Committee." },
          ],
        };
      }),
    })),

  generateContract: (loanId, actorName) =>
    set((s) => ({
      loans: s.loans.map((l) =>
        l.id === loanId
          ? {
              ...l,
              status: "contract-generated",
              timeline: [
                ...l.timeline,
                { stage: "contract-generated", date: MOCK_TODAY, officer: actorName, notes: "Loan agreement generated." },
              ],
            }
          : l
      ),
    })),

  disburseLoan: (loanId, actorName) => {
    const loan = get().loans.find((l) => l.id === loanId);
    if (!loan) return;
    set((s) => ({
      loans: s.loans.map((l) =>
        l.id === loanId
          ? {
              ...l,
              status: "disbursed",
              disbursedDate: MOCK_TODAY,
              remainingBalance: l.totalPayable,
              timeline: [
                ...l.timeline,
                { stage: "disbursed", date: MOCK_TODAY, officer: actorName, notes: "Funds disbursed to member's account." },
              ],
            }
          : l
      ),
      ledgerTransactions: [
        {
          id: nextId("led"),
          memberId: loan.memberId,
          type: "loan-disbursement-adjustment",
          amount: loan.amount,
          date: MOCK_TODAY,
          method: "bank-transfer",
          reference: loan.contractNumber,
          recordedBy: actorName,
        },
        ...s.ledgerTransactions,
      ],
    }));
    get().logAudit(actorName, "Disbursed loan", loan.contractNumber);
  },

  recordRepayment: (loanId, actorName) => {
    const loan = get().loans.find((l) => l.id === loanId);
    if (!loan) return;
    const installment = Math.min(loan.monthlyInstallment, loan.remainingBalance);
    const remaining = Math.max(0, loan.remainingBalance - installment);
    const completed = remaining <= 0;
    set((s) => ({
      loans: s.loans.map((l) =>
        l.id === loanId
          ? {
              ...l,
              status: completed ? "completed" : "repaying",
              remainingBalance: remaining,
              timeline: [
                ...l.timeline,
                completed
                  ? { stage: "completed", date: MOCK_TODAY, officer: actorName, notes: "Loan fully repaid. Contract closed." }
                  : { stage: "repaying", date: MOCK_TODAY, officer: actorName, notes: `Monthly installment of ${installment.toLocaleString()} RWF deducted from payroll.` },
              ],
            }
          : l
      ),
      ledgerTransactions: [
        {
          id: nextId("led"),
          memberId: loan.memberId,
          type: "loan-repayment",
          amount: installment,
          date: MOCK_TODAY,
          method: "payroll",
          reference: `${loan.contractNumber} / Installment`,
          recordedBy: actorName,
        },
        ...s.ledgerTransactions,
      ],
    }));
  },

  buyShares: (memberId, shares, actorName) => {
    const amount = shares * (get().shareHoldings[memberId]?.shareValue ?? 5000);
    const balance = get().savingsBalance(memberId) + amount;
    set((s) => ({
      shareHoldings: {
        ...s.shareHoldings,
        [memberId]: {
          memberId,
          shareValue: s.shareHoldings[memberId]?.shareValue ?? 5000,
          totalShares: (s.shareHoldings[memberId]?.totalShares ?? 0) + shares,
        },
      },
      savingsLedger: {
        ...s.savingsLedger,
        [memberId]: [
          ...(s.savingsLedger[memberId] ?? []),
          {
            id: nextId("sv"),
            memberId,
            date: MOCK_TODAY,
            type: "share-purchase",
            amount,
            balanceAfter: balance,
            description: `Purchase of ${shares} shares`,
            source: "Member Self-Service",
          },
        ],
      },
    }));
    get().logAudit(actorName, `Purchased ${shares} shares`, memberId);
  },

  addVoluntarySaving: (memberId, amount, actorName) => {
    const balance = get().savingsBalance(memberId) + amount;
    set((s) => ({
      savingsLedger: {
        ...s.savingsLedger,
        [memberId]: [
          ...(s.savingsLedger[memberId] ?? []),
          {
            id: nextId("sv"),
            memberId,
            date: MOCK_TODAY,
            type: "voluntary",
            amount,
            balanceAfter: balance,
            description: "Voluntary savings deposit",
            source: "Member Self-Service",
          },
        ],
      },
    }));
    get().logAudit(actorName, "Made a voluntary savings deposit", memberId);
  },

  importPayroll: (records, fileName, actorName) => {
    const members = get().members;
    const rows: PayrollImportRecord[] = [];
    const seenIds = new Set<string>();
    let successful = 0;
    let failed = 0;
    let duplicates = 0;
    let totalAmount = 0;

    for (const rec of records) {
      const member = members.find((m) => m.employeeId === rec.employeeId);
      if (seenIds.has(rec.employeeId)) {
        duplicates += 1;
        rows.push({
          employeeId: rec.employeeId,
          nationalId: member?.nationalId ?? "",
          name: member?.fullName ?? "Unknown",
          amount: rec.amount,
          status: "duplicate",
          errorReason: "Duplicate row for this Employee ID in the file.",
        });
        continue;
      }
      seenIds.add(rec.employeeId);
      if (!member) {
        failed += 1;
        rows.push({
          employeeId: rec.employeeId,
          nationalId: "",
          name: "Unknown",
          amount: rec.amount,
          status: "error",
          errorReason: "No matching member for this Employee ID.",
        });
        continue;
      }
      if (!rec.amount || rec.amount <= 0) {
        failed += 1;
        rows.push({
          employeeId: rec.employeeId,
          nationalId: member.nationalId,
          name: member.fullName,
          amount: rec.amount,
          status: "error",
          errorReason: "Invalid or zero amount.",
        });
        continue;
      }

      successful += 1;
      totalAmount += rec.amount;
      rows.push({
        employeeId: rec.employeeId,
        nationalId: member.nationalId,
        name: member.fullName,
        amount: rec.amount,
        status: "matched",
      });

      const balance = get().savingsBalance(member.id) + rec.amount;
      set((s) => ({
        savingsLedger: {
          ...s.savingsLedger,
          [member.id]: [
            ...(s.savingsLedger[member.id] ?? []),
            {
              id: nextId("sv"),
              memberId: member.id,
              date: MOCK_TODAY,
              type: "salary-deduction",
              amount: rec.amount,
              balanceAfter: balance,
              description: "Monthly salary savings deduction",
              source: `Payroll Import — ${fileName}`,
            },
          ],
        },
      }));
    }

    const summary: PayrollImportSummary = {
      id: nextId("imp"),
      fileName,
      importedBy: actorName,
      date: MOCK_TODAY,
      totalRecords: records.length,
      successful,
      failed,
      duplicates,
      totalAmount,
    };

    set((s) => ({ payrollImports: [summary, ...s.payrollImports] }));
    get().logAudit(actorName, "Imported payroll savings", `${fileName} (${records.length} records)`);

    return { summary, rows };
  },

  addMember: (input, actorName) => {
    const id = nextId("mem");
    const member: AppUser = {
      id,
      nationalId: input.nationalId,
      employeeId: input.employeeId,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      department: input.department,
      position: input.position,
      organizationId: get().organization.id,
      roles: ["member"],
      status: "active",
      dateJoined: MOCK_TODAY,
      avatarInitials: input.fullName
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
      monthlySalary: input.monthlySalary,
    };
    set((s) => ({
      members: [...s.members, member],
      savingsLedger: { ...s.savingsLedger, [id]: [] },
      shareHoldings: { ...s.shareHoldings, [id]: { memberId: id, totalShares: 5, shareValue: 5000 } },
    }));
    get().logAudit(actorName, "Registered new member", member.fullName);
    return member;
  },

  setMemberStatus: (memberId, status, actorName) => {
    set((s) => ({
      members: s.members.map((m) => (m.id === memberId ? { ...m, status } : m)),
    }));
    const member = get().members.find((m) => m.id === memberId);
    get().logAudit(actorName, `Set member status to ${status}`, member?.fullName ?? memberId);
  },

  createMeeting: (input, actorName) =>
    set((s) => ({
      meetings: [
        {
          ...input,
          id: nextId("mtg"),
          status: "upcoming",
          attendeeIds: [],
          createdBy: actorName,
        },
        ...s.meetings,
      ],
    })),

  createAnnouncement: (input, actorName) =>
    set((s) => ({
      announcements: [
        { ...input, id: nextId("ann"), date: MOCK_TODAY, author: actorName },
        ...s.announcements,
      ],
    })),

  addDocument: (input, actorName) =>
    set((s) => ({
      documents: [
        { ...input, id: nextId("doc"), uploadedDate: MOCK_TODAY, uploadedBy: actorName },
        ...s.documents,
      ],
    })),

  requestExit: (memberId, reason) =>
    set((s) => ({
      exitRequests: [
        { id: nextId("exit"), memberId, reason, requestedDate: MOCK_TODAY, status: "pending" },
        ...s.exitRequests,
      ],
    })),

  requestShareWithdrawal: (memberId, shares) => {
    const value = get().shareHoldings[memberId]?.shareValue ?? 5000;
    set((s) => ({
      shareWithdrawals: [
        {
          id: nextId("wdr"),
          memberId,
          shares,
          amount: shares * value,
          requestedDate: MOCK_TODAY,
          status: "pending",
        },
        ...s.shareWithdrawals,
      ],
    }));
  },

  decideExitRequest: (id, decision, actorName) => {
    const request = get().exitRequests.find((r) => r.id === id);
    set((s) => ({
      exitRequests: s.exitRequests.map((r) =>
        r.id === id
          ? { ...r, status: decision === "approve" ? "approved" : "rejected", decidedBy: actorName, decidedDate: MOCK_TODAY }
          : r
      ),
      members:
        decision === "approve" && request
          ? s.members.map((m) => (m.id === request.memberId ? { ...m, status: "exited" } : m))
          : s.members,
    }));
    if (request) {
      get().logAudit(
        actorName,
        decision === "approve" ? "Approved membership exit" : "Rejected membership exit",
        request.memberId
      );
    }
  },

  decideShareWithdrawal: (id, decision, actorName) =>
    set((s) => ({
      shareWithdrawals: s.shareWithdrawals.map((r) =>
        r.id === id
          ? { ...r, status: decision === "approve" ? "approved" : "rejected", decidedBy: actorName, decidedDate: MOCK_TODAY }
          : r
      ),
    })),

  createBackup: (label, organizationId) =>
    set((s) => ({
      backups: [
        { id: nextId("bkp"), organizationId, label, date: MOCK_TODAY, sizeMb: 80 + Math.round(Math.random() * 10), type: "manual" },
        ...s.backups,
      ],
    })),

  markNotificationRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),

  markAllNotificationsRead: (userId) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.userId === userId ? { ...n, read: true } : n
      ),
    })),

  setMemberRoles: (memberId, roles, actorName) => {
    set((s) => ({
      members: s.members.map((m) => (m.id === memberId ? { ...m, roles } : m)),
    }));
    const member = get().members.find((m) => m.id === memberId);
    get().logAudit(actorName, "Updated member roles", member?.fullName ?? memberId);
  },

  updateOrganization: (patch, actorName) => {
    set((s) => ({ organization: { ...s.organization, ...patch } }));
    get().logAudit(actorName, "Updated organization settings", get().organization.name);
  },

  setOrganizationStatus: (organizationId, status, actorName) => {
    set((s) => ({
      organizations: s.organizations.map((o) => (o.id === organizationId ? { ...o, status } : o)),
      organization: s.organization.id === organizationId ? { ...s.organization, status } : s.organization,
    }));
    const org = get().organizations.find((o) => o.id === organizationId);
    get().logAudit(actorName, `Set organization status to ${status}`, org?.name ?? organizationId);
  },

  setOrganizationPlan: (organizationId, plan, actorName) => {
    set((s) => ({
      organizations: s.organizations.map((o) => (o.id === organizationId ? { ...o, plan } : o)),
      organization: s.organization.id === organizationId ? { ...s.organization, plan } : s.organization,
    }));
    const org = get().organizations.find((o) => o.id === organizationId);
    get().logAudit(actorName, `Changed subscription plan to ${plan}`, org?.name ?? organizationId);
  },

  updateMeeting: (id, patch) =>
    set((s) => ({
      meetings: s.meetings.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),
}));
