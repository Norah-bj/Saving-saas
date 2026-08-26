import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import type { Loan, LoanStatus } from "@/lib/types";

/** Raw shape of the backend's loan.LoanDetailDto/LoanTimelineEventDto, before adapting to the frontend's Loan type. */
interface LoanTimelineEventDto {
  stage: LoanStatus;
  occurredOn: string;
  officer: string;
  notes: string | null;
}

interface LoanDetailDto {
  id: string;
  contractNumber: string;
  memberId: string;
  amount: number;
  purpose: string;
  periodMonths: number;
  interestRate: number;
  insuranceRequired: boolean;
  insuranceFee: number;
  monthlyInstallment: number;
  totalPayable: number;
  remainingBalance: number;
  status: LoanStatus;
  appliedDate: string;
  approvedDate: string | null;
  disbursedDate: string | null;
  riskScore: number;
  riskBand: string;
  committeeNotes: string | null;
  guarantorIds: string[];
  /** Null when no guarantor was required — a loan has at most one guarantor in this system. */
  guaranteeStatus: "pending" | "accepted" | "rejected" | "released" | null;
  timeline: LoanTimelineEventDto[];
}

/**
 * Adapts the backend DTO to the existing frontend Loan type exactly, so
 * every shared component that already expects that shape (LoanStagePipeline,
 * LoanTimelineList, LoanStatusBadge, ...) works unchanged. Two real
 * conversions, not just renames:
 * - timeline events: `occurredOn` -> `date` (LoanTimelineEvent's field name)
 * - interestRate: backend returns a fraction (0.05); the frontend type/every
 *   consumer of it expects a whole percentage (5), same unit mismatch
 *   documented throughout this session's backend work.
 */
function adaptLoan(dto: LoanDetailDto): Loan {
  return {
    id: dto.id,
    contractNumber: dto.contractNumber,
    memberId: dto.memberId,
    amount: dto.amount,
    purpose: dto.purpose,
    periodMonths: dto.periodMonths,
    interestRate: dto.interestRate * 100,
    insuranceRequired: dto.insuranceRequired,
    insuranceFee: dto.insuranceFee,
    monthlyInstallment: dto.monthlyInstallment,
    totalPayable: dto.totalPayable,
    remainingBalance: dto.remainingBalance,
    status: dto.status,
    guarantorIds: dto.guarantorIds,
    appliedDate: dto.appliedDate,
    approvedDate: dto.approvedDate ?? undefined,
    disbursedDate: dto.disbursedDate ?? undefined,
    riskScore: dto.riskScore,
    committeeNotes: dto.committeeNotes ?? undefined,
    timeline: dto.timeline.map((e) => ({
      stage: e.stage,
      date: e.occurredOn,
      officer: e.officer,
      notes: e.notes ?? undefined,
    })),
  };
}

interface LoanSummaryDto {
  id: string;
  contractNumber: string;
  memberId: string;
  amount: number;
  purpose: string;
  periodMonths: number;
  status: LoanStatus;
  appliedDate: string;
  riskScore: number;
  riskBand: string;
  decidedDate: string | null;
}

interface LoanListResponse {
  content: LoanSummaryDto[];
  totalElements: number;
}

const LOAN_LIST_SIZE = 500;

/** With no memberId, the backend already scopes to "my own loans" for a non-staff caller. */
export function useMyLoans() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const query = useQuery({
    queryKey: ["loans", "mine"],
    queryFn: () => apiClient.get<LoanListResponse>(`/loans?size=${LOAN_LIST_SIZE}`),
    enabled: !!accessToken,
  });

  const loans = query.data?.content.map((dto) => ({
    id: dto.id,
    contractNumber: dto.contractNumber,
    memberId: dto.memberId,
    amount: dto.amount,
    purpose: dto.purpose,
    status: dto.status,
    appliedDate: dto.appliedDate,
  }));

  return { ...query, data: loans };
}

/** Mirrors the backend's loan.LoanSummaryDto — the shape loan-committee list/report pages need. */
export interface LoanSummary {
  id: string;
  contractNumber: string;
  memberId: string;
  amount: number;
  purpose: string;
  periodMonths: number;
  status: LoanStatus;
  appliedDate: string;
  riskScore: number;
  /** Approval date for approved-or-later loans; an updatedAt-derived approximation for rejected ones; null while undecided. */
  decidedDate: string | null;
}

/**
 * Staff-wide loan list (loan-committee, accountant, org-admin, ...) — same
 * `GET /loans` endpoint as useMyLoans, but the backend already returns every
 * org loan (not just the caller's own) once the caller holds a staff role,
 * so no extra param is needed here.
 */
export function useLoans() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const query = useQuery({
    queryKey: ["loans", "all"],
    queryFn: () => apiClient.get<LoanListResponse>(`/loans?size=${LOAN_LIST_SIZE}`),
    enabled: !!accessToken,
  });

  const loans: LoanSummary[] | undefined = query.data?.content.map((dto) => ({
    id: dto.id,
    contractNumber: dto.contractNumber,
    memberId: dto.memberId,
    amount: dto.amount,
    purpose: dto.purpose,
    periodMonths: dto.periodMonths,
    status: dto.status,
    appliedDate: dto.appliedDate,
    riskScore: dto.riskScore,
    decidedDate: dto.decidedDate,
  }));

  return { ...query, data: loans };
}

export function useStartReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (loanId: string) => adaptLoan(await apiClient.post<LoanDetailDto>(`/loans/${loanId}/start-review`)),
    onSuccess: (_data, loanId) => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["loan", loanId] });
    },
  });
}

export function useCommitteeDecision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ loanId, approve, notes }: { loanId: string; approve: boolean; notes?: string }) =>
      adaptLoan(await apiClient.post<LoanDetailDto>(`/loans/${loanId}/committee-decision`, { approve, notes })),
    onSuccess: (_data, { loanId }) => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["loan", loanId] });
    },
  });
}

export function useLoanDetail(loanId: string | undefined) {
  const query = useQuery({
    queryKey: ["loan", loanId],
    queryFn: () => apiClient.get<LoanDetailDto>(`/loans/${loanId}`),
    enabled: !!loanId,
  });
  return {
    ...query,
    data: query.data ? adaptLoan(query.data) : undefined,
    // Not part of the frontend's Loan type (the mock keeps guarantees in a
    // separate array) — exposed alongside it instead, same pattern as
    // use-current-user.ts's emailVerified.
    guaranteeStatus: query.data?.guaranteeStatus ?? null,
  };
}

export interface ApplyLoanInput {
  amount: number;
  purpose: string;
  periodMonths: number;
  guarantorId?: string;
}

export function useApplyLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ApplyLoanInput) => adaptLoan(await apiClient.post<LoanDetailDto>("/loans", input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["loans"] }),
  });
}
