import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { SavingsTransaction, SavingsTxType } from "@/lib/types";

/** Raw shape of the backend's savings.SavingsTransactionDto (before adapting to the frontend's SavingsTransaction type). */
interface SavingsTransactionDto {
  id: string;
  occurredOn: string;
  type: SavingsTxType;
  amount: number;
  balanceAfter: number;
  description: string;
  source: string;
}

interface SavingsLedgerResponse {
  content: SavingsTransactionDto[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  currentBalanceRwf: number;
}

// Large enough to cover any real member's full history in one page — this
// workspace slice doesn't build pagination UI, matching the mock (which
// never paginated either).
const LEDGER_PAGE_SIZE = 1000;

/**
 * The backend returns newest-first (createdAt DESC); every consumer of this
 * ledger (chart series, statement opening-balance calc) assumes
 * oldest-first, same as the mock's seed data — so this reverses it once,
 * here, rather than making every page re-derive the right order.
 */
export function useSavingsLedger(memberId: string | undefined) {
  const query = useQuery({
    queryKey: ["savings-ledger", memberId],
    queryFn: () => apiClient.get<SavingsLedgerResponse>(`/members/${memberId}/savings-ledger?size=${LEDGER_PAGE_SIZE}`),
    enabled: !!memberId,
  });

  const ledger: SavingsTransaction[] = query.data
    ? [...query.data.content].reverse().map((tx) => ({
        id: tx.id,
        memberId: memberId!,
        date: tx.occurredOn,
        type: tx.type,
        amount: tx.amount,
        balanceAfter: tx.balanceAfter,
        description: tx.description,
        source: tx.source,
      }))
    : [];

  return { ledger, currentBalance: query.data?.currentBalanceRwf ?? 0, isLoading: query.isLoading };
}

export function useAddVoluntarySaving(memberId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { amountRwf: number; source: string }) =>
      apiClient.post(`/members/${memberId}/savings/voluntary`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savings-ledger", memberId] });
      queryClient.invalidateQueries({ queryKey: ["member-detail", memberId] });
    },
  });
}

interface BuySharesResponseDto {
  memberId: string;
  totalShares: number;
  shareValueRwf: number;
  totalValueRwf: number;
  ledgerEntry: SavingsTransactionDto;
}

export function useBuyShares(memberId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shares: number) =>
      apiClient.post<BuySharesResponseDto>(`/members/${memberId}/shares/buy`, { shares }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savings-ledger", memberId] });
      queryClient.invalidateQueries({ queryKey: ["member-detail", memberId] });
    },
  });
}
