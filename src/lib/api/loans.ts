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

export function useLoanDetail(loanId: string | undefined) {
  const query = useQuery({
    queryKey: ["loan", loanId],
    queryFn: () => apiClient.get<LoanDetailDto>(`/loans/${loanId}`),
    enabled: !!loanId,
  });
  return { ...query, data: query.data ? adaptLoan(query.data) : undefined };
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
