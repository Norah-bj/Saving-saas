import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiUrl } from "@/lib/api/client";
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
  /** ISO time of the last logo upload; null when no logo is set (show logoInitials instead). */
  logoUpdatedAt: string | null;
  plan: string;
  status: string;
  legalRepresentativeName: string;
  legalRepresentativeTitle: string;
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

export interface UpdateOrganizationProfileInput {
  name: string;
  shortName: string;
  district: string;
  sector: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  logoInitials: string;
  brandColor: string;
  stampLabel: string;
}

/** ORG_ADMIN only. Branding/contact fields — deliberately separate from loan policy, see docs/API.md. */
export function useUpdateOrganizationProfile() {
  const organizationId = useAuthStore((s) => s.user?.organizationId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateOrganizationProfileInput) =>
      apiClient.patch<OrganizationDto>(`/organizations/${organizationId}/profile`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["organization", organizationId] }),
  });
}

/** Public logo URL, versioned so a new upload shows immediately. Null when no logo is set. */
export function organizationLogoUrl(organizationId: string | null | undefined, logoUpdatedAt: string | null | undefined) {
  if (!organizationId || !logoUpdatedAt) return null;
  return apiUrl(`/organizations/${organizationId}/logo?v=${encodeURIComponent(logoUpdatedAt)}`);
}

export const LOGO_MAX_BYTES = 1024 * 1024;
export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

/** ORG_ADMIN only. PNG, JPG or WebP up to 1 MB; the server checks the file's real type. */
export function useUploadOrganizationLogo() {
  const organizationId = useAuthStore((s) => s.user?.organizationId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return apiClient.put<OrganizationDto>(`/organizations/${organizationId}/logo`, form);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["organization", organizationId] }),
  });
}

export function useRemoveOrganizationLogo() {
  const organizationId = useAuthStore((s) => s.user?.organizationId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.delete<OrganizationDto>(`/organizations/${organizationId}/logo`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["organization", organizationId] }),
  });
}
