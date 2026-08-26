import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import type { Organization } from "@/lib/types";

/** Mirrors the backend's organization.OrganizationDto, as returned by the platform-wide endpoints. */
interface PlatformOrganizationDto {
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
  plan: Organization["plan"];
  status: Organization["status"];
  legalRepresentativeName: string;
  legalRepresentativeTitle: string;
  shareValueRwf: number;
  loanInterestRate: number;
  loanInsuranceRate: number;
  minMonthsBeforeEligible: number;
  allowedRepaymentPeriods: number[];
  createdAt: string;
  memberCount: number;
}

/** Same fraction/whole-percentage unit mismatch as organization.ts's self-scoped OrganizationDto. */
function adaptOrganization(dto: PlatformOrganizationDto): Organization {
  return {
    id: dto.id,
    name: dto.name,
    shortName: dto.shortName,
    slug: dto.slug,
    district: dto.district,
    sector: dto.sector,
    address: dto.address,
    contactEmail: dto.contactEmail,
    contactPhone: dto.contactPhone,
    logoInitials: dto.logoInitials,
    brandColor: dto.brandColor,
    stampLabel: dto.stampLabel,
    plan: dto.plan,
    memberCount: dto.memberCount,
    createdAt: dto.createdAt,
    status: dto.status,
    loanInterestRate: dto.loanInterestRate * 100,
    loanInsuranceRate: dto.loanInsuranceRate * 100,
    minMonthsBeforeEligible: dto.minMonthsBeforeEligible,
    allowedRepaymentPeriods: dto.allowedRepaymentPeriods,
    legalRepresentativeName: dto.legalRepresentativeName,
    legalRepresentativeTitle: dto.legalRepresentativeTitle,
  };
}

/** SUPER_ADMIN only — every organization on the platform, not just the caller's own. */
export function usePlatformOrganizations() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const query = useQuery({
    queryKey: ["platform-organizations"],
    queryFn: () => apiClient.get<PlatformOrganizationDto[]>("/organizations"),
    enabled: !!accessToken,
  });
  return { ...query, data: query.data?.map(adaptOrganization) };
}

/** 409s if the organization is already at that status. */
export function useUpdatePlatformOrganizationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ organizationId, status }: { organizationId: string; status: Organization["status"] }) =>
      apiClient.post<PlatformOrganizationDto>(`/organizations/${organizationId}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["platform-organizations"] }),
  });
}

export function useUpdatePlatformOrganizationPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ organizationId, plan }: { organizationId: string; plan: Organization["plan"] }) =>
      apiClient.post<PlatformOrganizationDto>(`/organizations/${organizationId}/plan`, { plan }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["platform-organizations"] }),
  });
}
