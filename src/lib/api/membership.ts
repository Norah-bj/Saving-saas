import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import type { ExitRequest, ShareWithdrawalRequest } from "@/lib/types";

export interface ExitEligibility {
  eligible: boolean;
  outstandingLoans: { id: string; contractNumber: string; remainingBalance: number }[];
  activeGuarantees: { guaranteeId: string; loanContractNumber: string; amountGuaranteed: number }[];
}

export function useExitEligibility(memberId: string | undefined) {
  return useQuery({
    queryKey: ["exit-eligibility", memberId],
    queryFn: () => apiClient.get<ExitEligibility>(`/members/${memberId}/exit-eligibility`),
    enabled: !!memberId,
  });
}

/** Staff see every request in the org; a plain member sees only their own — same response shape either way. */
export function useExitRequests() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["exit-requests"],
    queryFn: () => apiClient.get<ExitRequest[]>("/exit-requests"),
    enabled: !!accessToken,
  });
}

export function useSubmitExitRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => apiClient.post<ExitRequest>("/exit-requests", { reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["exit-requests"] }),
  });
}

export function useDecideExitRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "approve" | "reject" }) =>
      apiClient.post<ExitRequest>(`/exit-requests/${id}/decision`, { decision }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["exit-requests"] }),
  });
}

export function useShareWithdrawalRequests() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["share-withdrawals"],
    queryFn: () => apiClient.get<ShareWithdrawalRequest[]>("/share-withdrawals"),
    enabled: !!accessToken,
  });
}

export function useSubmitShareWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shares: number) =>
      apiClient.post<ShareWithdrawalRequest>("/share-withdrawals", { shares }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["share-withdrawals"] }),
  });
}

export function useDecideShareWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "approve" | "reject" }) =>
      apiClient.post<ShareWithdrawalRequest>(`/share-withdrawals/${id}/decision`, { decision }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["share-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["member-detail"] });
    },
  });
}
