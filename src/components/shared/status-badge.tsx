import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  LOAN_STATUS_LABEL,
  type GuaranteeStatus,
  type LoanStatus,
  type MemberStatus,
  type RequestStatus,
} from "@/lib/types";

export type Tone = "success" | "warning" | "destructive" | "info" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  destructive:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
  info: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400",
  neutral: "border-border bg-muted text-muted-foreground",
};

export function ToneBadge({ tone, label, className }: { tone: Tone; label: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn(TONE_CLASSES[tone], "font-medium", className)}>
      {label}
    </Badge>
  );
}

const LOAN_STATUS_TONE: Record<LoanStatus, Tone> = {
  submitted: "neutral",
  "under-review": "info",
  "guarantor-approval": "warning",
  "committee-review": "warning",
  approved: "success",
  rejected: "destructive",
  "contract-generated": "info",
  disbursed: "info",
  repaying: "info",
  completed: "success",
};

export function LoanStatusBadge({ status, className }: { status: LoanStatus; className?: string }) {
  return <ToneBadge tone={LOAN_STATUS_TONE[status]} label={LOAN_STATUS_LABEL[status]} className={className} />;
}

const REQUEST_STATUS_TONE: Record<RequestStatus, Tone> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
};

const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export function RequestStatusBadge({ status, className }: { status: RequestStatus; className?: string }) {
  return (
    <ToneBadge tone={REQUEST_STATUS_TONE[status]} label={REQUEST_STATUS_LABEL[status]} className={className} />
  );
}

const MEMBER_STATUS_TONE: Record<MemberStatus, Tone> = {
  active: "success",
  suspended: "destructive",
  exited: "neutral",
  pending: "warning",
};

const MEMBER_STATUS_LABEL: Record<MemberStatus, string> = {
  active: "Active",
  suspended: "Suspended",
  exited: "Exited",
  pending: "Pending",
};

export function MemberStatusBadge({ status, className }: { status: MemberStatus; className?: string }) {
  return (
    <ToneBadge tone={MEMBER_STATUS_TONE[status]} label={MEMBER_STATUS_LABEL[status]} className={className} />
  );
}

const GUARANTEE_STATUS_TONE: Record<GuaranteeStatus, Tone> = {
  pending: "warning",
  accepted: "success",
  rejected: "destructive",
  released: "neutral",
};

const GUARANTEE_STATUS_LABEL: Record<GuaranteeStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  released: "Released",
};

export function GuaranteeStatusBadge({ status, className }: { status: GuaranteeStatus; className?: string }) {
  return (
    <ToneBadge tone={GUARANTEE_STATUS_TONE[status]} label={GUARANTEE_STATUS_LABEL[status]} className={className} />
  );
}
