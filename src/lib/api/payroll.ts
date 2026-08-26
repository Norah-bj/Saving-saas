import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, type PageResponse } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import type { PayrollImportRecord, PayrollImportSummary } from "@/lib/types";

interface PayrollImportSummaryDto {
  id: string;
  fileName: string;
  importedBy: string;
  occurredOn: string;
  totalRecords: number;
  successful: number;
  failed: number;
  duplicates: number;
  totalAmountRwf: number;
}

function adaptSummary(dto: PayrollImportSummaryDto): PayrollImportSummary {
  return {
    id: dto.id,
    fileName: dto.fileName,
    importedBy: dto.importedBy,
    date: dto.occurredOn,
    totalRecords: dto.totalRecords,
    successful: dto.successful,
    failed: dto.failed,
    duplicates: dto.duplicates,
    totalAmount: dto.totalAmountRwf,
  };
}

interface PayrollImportResultDto {
  summary: PayrollImportSummaryDto;
  rows: PayrollImportRecord[];
}

export interface PayrollImportResult {
  summary: PayrollImportSummary;
  rows: PayrollImportRecord[];
}

/**
 * Unlike the mock, there's no client-side-parse-then-confirm step — the
 * backend parses and validates the real .xlsx server-side (Apache POI) in
 * one atomic call and returns the full result immediately. The mock's
 * "preview before importing" step has no real equivalent to wire; see
 * docs/KNOWN_ISSUES.md.
 */
export function useImportPayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const result = await apiClient.post<PayrollImportResultDto>("/payroll/import", formData);
      return { summary: adaptSummary(result.summary), rows: result.rows } satisfies PayrollImportResult;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payroll-imports"] }),
  });
}

const IMPORTS_LIST_SIZE = 500;

export function usePayrollImports() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const query = useQuery({
    queryKey: ["payroll-imports"],
    queryFn: () => apiClient.get<PageResponse<PayrollImportSummaryDto>>(`/payroll/imports?size=${IMPORTS_LIST_SIZE}`),
    enabled: !!accessToken,
  });

  return { ...query, data: query.data?.content.map(adaptSummary) };
}
