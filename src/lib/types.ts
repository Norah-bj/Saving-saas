// Core domain types for IkiminaConnect.
// These mirror the entities the future Spring Boot / PostgreSQL API will expose —
// see docs/BACKEND_CONTRACT.md.

export type Role =
  | "member"
  | "secretary"
  | "accountant"
  | "loan-committee"
  | "hr"
  | "org-admin"
  | "super-admin";

export type MemberStatus = "active" | "suspended" | "exited" | "pending";

export interface Organization {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  district: string;
  sector: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  logoInitials: string;
  brandColor: string;
  stampLabel: string;
  plan: "starter" | "growth" | "enterprise";
  memberCount: number;
  createdAt: string;
  status: "active" | "suspended" | "trial";
  loanInterestRate: number;
  loanInsuranceRate: number;
  minMonthsBeforeEligible: number;
  allowedRepaymentPeriods: number[];
  legalRepresentativeName: string;
  legalRepresentativeTitle: string;
}

export interface AppUser {
  id: string;
  nationalId: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  organizationId: string;
  roles: Role[];
  status: MemberStatus;
  dateJoined: string;
  avatarInitials: string;
  monthlySalary: number;
  bankName?: string;
  bankAccountNumber?: string;
}

export type SavingsTxType =
  | "salary-deduction"
  | "voluntary"
  | "share-purchase"
  | "loan-repayment"
  | "withdrawal"
  | "loan-disbursement-adjustment";

export interface SavingsTransaction {
  id: string;
  memberId: string;
  date: string;
  type: SavingsTxType;
  amount: number;
  balanceAfter: number;
  description: string;
  source: string;
}

export interface ShareHolding {
  memberId: string;
  totalShares: number;
  shareValue: number;
}

export type LoanStatus =
  | "submitted"
  | "under-review"
  | "guarantor-approval"
  | "committee-review"
  | "approved"
  | "rejected"
  | "contract-generated"
  | "disbursed"
  | "repaying"
  | "completed";

export interface LoanTimelineEvent {
  stage: LoanStatus;
  date: string;
  officer: string;
  notes?: string;
}

export interface Loan {
  id: string;
  contractNumber: string;
  memberId: string;
  amount: number;
  purpose: string;
  periodMonths: number;
  interestRate: number; // 5
  insuranceRequired: boolean;
  insuranceFee: number;
  monthlyInstallment: number;
  totalPayable: number;
  remainingBalance: number;
  status: LoanStatus;
  guarantorIds: string[];
  appliedDate: string;
  approvedDate?: string;
  disbursedDate?: string;
  riskScore: number; // 0-100
  committeeNotes?: string;
  timeline: LoanTimelineEvent[];
}

export type GuaranteeStatus = "pending" | "accepted" | "rejected" | "released";

export interface Guarantee {
  id: string;
  loanId: string;
  borrowerId: string;
  guarantorId: string;
  amountGuaranteed: number;
  status: GuaranteeStatus;
  requestedDate: string;
  respondedDate?: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  agenda: string[];
  status: "upcoming" | "completed" | "cancelled";
  attendeeIds: string[];
  minutesSummary?: string;
  createdBy: string;
}

export type AnnouncementPriority = "normal" | "important" | "urgent";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  date: string;
  priority: AnnouncementPriority;
  author: string;
  audience: "all" | "members" | "admins";
}

export type DocumentCategory =
  | "constitution"
  | "policy"
  | "report"
  | "minutes"
  | "form";

export interface DocumentItem {
  id: string;
  name: string;
  category: DocumentCategory;
  fileType: "pdf" | "docx" | "xlsx";
  uploadedDate: string;
  uploadedBy: string;
  sizeKb: number;
  visibility: "all" | "admins";
}

export interface LedgerTransaction {
  id: string;
  memberId: string;
  type: SavingsTxType | "loan-repayment" | "insurance-fee" | "interest-income";
  amount: number;
  date: string;
  method: "payroll" | "cash" | "mobile-money" | "bank-transfer";
  reference: string;
  recordedBy: string;
}

export interface PayrollImportRecord {
  employeeId: string;
  nationalId: string;
  name: string;
  amount: number;
  status: "matched" | "error" | "duplicate";
  errorReason?: string;
}

export interface PayrollImportSummary {
  id: string;
  fileName: string;
  importedBy: string;
  date: string;
  totalRecords: number;
  successful: number;
  failed: number;
  duplicates: number;
  totalAmount: number;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  date: string;
  read: boolean;
  type: "loan" | "meeting" | "announcement" | "savings" | "system";
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  date: string;
  organizationId: string;
}

export interface BackupRecord {
  id: string;
  organizationId: string | "platform";
  label: string;
  date: string;
  sizeMb: number;
  type: "manual" | "scheduled";
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceMonthlyRwf: number;
  maxMembers: number;
  features: string[];
}

export interface RolePolicy {
  id: string;
  title: string;
  category:
    | "membership"
    | "savings"
    | "shares"
    | "loan"
    | "guarantor"
    | "suspension"
    | "exit"
    | "privacy";
  summary: string;
  body: string[];
  updatedAt: string;
}

export type RequestStatus = "pending" | "approved" | "rejected";

export interface ExitRequest {
  id: string;
  memberId: string;
  reason: string;
  requestedDate: string;
  status: RequestStatus;
  decidedBy?: string;
  decidedDate?: string;
}

export interface ShareWithdrawalRequest {
  id: string;
  memberId: string;
  shares: number;
  amount: number;
  requestedDate: string;
  status: RequestStatus;
  decidedBy?: string;
  decidedDate?: string;
}

export const LOAN_STATUS_LABEL: Record<LoanStatus, string> = {
  submitted: "Submitted",
  "under-review": "Under Review",
  "guarantor-approval": "Guarantor Approval",
  "committee-review": "Committee Review",
  approved: "Approved",
  rejected: "Rejected",
  "contract-generated": "Contract Generated",
  disbursed: "Disbursed",
  repaying: "Repaying",
  completed: "Completed",
};

export const LOAN_STATUS_ORDER: LoanStatus[] = [
  "submitted",
  "under-review",
  "guarantor-approval",
  "committee-review",
  "approved",
  "contract-generated",
  "disbursed",
  "repaying",
  "completed",
];

export const ROLE_LABEL: Record<Role, string> = {
  member: "Member",
  secretary: "Secretary",
  accountant: "Accountant",
  "loan-committee": "Loan Committee",
  hr: "HR Officer",
  "org-admin": "Organization Admin",
  "super-admin": "Super Admin",
};
