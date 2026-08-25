import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import type { GuaranteeStatus } from "@/lib/types";

/** Mirrors the backend's loan.GuaranteeDto — already denormalized with borrower/loan display fields. */
export interface Guarantee {
  id: string;
  loanId: string;
  loanContractNumber: string;
  loanRemainingBalance: number;
  borrowerId: string;
  borrowerName: string;
  amountGuaranteed: number;
  status: GuaranteeStatus;
  requestedDate: string;
  respondedDate: string | null;
}

/** Always "my requests as guarantor" — no org-wide view exists (see backend/API.md). */
export function useMyGuarantees() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["guarantees"],
    queryFn: () => apiClient.get<Guarantee[]>("/guarantees"),
    enabled: !!accessToken,
  });
}

export function useRespondGuarantee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) =>
      apiClient.post<Guarantee>(`/guarantees/${id}/respond`, { accept }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["guarantees"] }),
  });
}
