import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";

/** Mirrors the backend's organization.OrganizationDto (fields this workspace slice actually uses). */
export interface OrganizationDto {
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
  plan: string;
  status: string;
  shareValueRwf: number;
  /**
   * Fractions (0.05 = 5%), unlike the old frontend mock's whole-percentage
   * convention (5) — this backend stores/returns rates as fractions
   * everywhere. Multiply by 100 to display as a percentage; pass directly
   * (no /100) into loan-calculator.ts, which also expects a fraction.
   */
  loanInterestRate: number;
  loanInsuranceRate: number;
  minMonthsBeforeEligible: number;
  allowedRepaymentPeriods: number[];
}

/** Null for a platform super-admin (no organization) — callers should guard for that. */
export function useOrganization() {
  const organizationId = useAuthStore((s) => s.user?.organizationId);
  return useQuery({
    queryKey: ["organization", organizationId],
    queryFn: () => apiClient.get<OrganizationDto>(`/organizations/${organizationId}`),
    enabled: !!organizationId,
  });
}

export interface UpdateLoanPolicyInput {
  /** Whole percentages (e.g. 5, not 0.05) — converted to a fraction before the request goes out. */
  loanInterestRate: number;
  loanInsuranceRate: number;
  minMonthsBeforeEligible: number;
  allowedRepaymentPeriods: number[];
}

export function useUpdateLoanPolicy() {
  const organizationId = useAuthStore((s) => s.user?.organizationId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateLoanPolicyInput) =>
      apiClient.patch<OrganizationDto>(`/organizations/${organizationId}/loan-policy`, {
        loanInterestRate: input.loanInterestRate / 100,
        loanInsuranceRate: input.loanInsuranceRate / 100,
        minMonthsBeforeEligible: input.minMonthsBeforeEligible,
        allowedRepaymentPeriods: input.allowedRepaymentPeriods,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["organization", organizationId] }),
  });
}
