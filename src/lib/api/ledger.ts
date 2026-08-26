import { useQuery } from "@tanstack/react-query";
import { apiClient, type PageResponse } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import type { LedgerTransaction } from "@/lib/types";

/** Raw shape of the backend's ledger.LedgerTransactionDto, before adapting `occurredOn` -> `date`. */
interface LedgerTransactionDto {
  id: string;
  memberId: string;
  type: LedgerTransaction["type"];
  method: LedgerTransaction["method"];
  amount: number;
  occurredOn: string;
  reference: string;
  recordedBy: string;
}

const LEDGER_LIST_SIZE = 500;

/** ACCOUNTANT/ORG_ADMIN only. No pagination UI in this workspace slice, same as every other staff list — one large page. */
export function useLedger(filters?: { type?: string; method?: string; memberId?: string }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const params = new URLSearchParams({ size: String(LEDGER_LIST_SIZE) });
  if (filters?.type) params.set("type", filters.type);
  if (filters?.method) params.set("method", filters.method);
  if (filters?.memberId) params.set("memberId", filters.memberId);

  const query = useQuery({
    queryKey: ["ledger", filters?.type ?? "", filters?.method ?? "", filters?.memberId ?? ""],
    queryFn: () => apiClient.get<PageResponse<LedgerTransactionDto>>(`/ledger?${params.toString()}`),
    enabled: !!accessToken,
  });

  const transactions: LedgerTransaction[] | undefined = query.data?.content.map((dto) => ({
    id: dto.id,
    memberId: dto.memberId,
    date: dto.occurredOn,
    type: dto.type,
    method: dto.method,
    amount: dto.amount,
    reference: dto.reference,
    recordedBy: dto.recordedBy,
  }));

  return { ...query, data: transactions };
}
