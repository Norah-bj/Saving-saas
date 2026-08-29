import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import type { PageResponse } from "@/lib/api/client";
import type { Role, MemberStatus } from "@/lib/types";

/** Mirrors the backend's member.MemberDetail. */
export interface MemberDetailDto {
  id: string;
  organizationId: string;
  nationalId: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  status: string;
  dateJoined: string;
  monthlySalaryRwf: number;
  roles: string[];
  committeeChair: boolean;
  savingsBalanceRwf: number;
  totalShares: number;
}

/**
 * No dedicated "my share holding" endpoint exists — GET /members/{id} is
 * self-accessible and already carries totalShares/savingsBalanceRwf, so
 * this is reused for that rather than adding a redundant endpoint.
 */
export function useMemberDetail(memberId: string | undefined) {
  return useQuery({
    queryKey: ["member-detail", memberId],
    queryFn: () => apiClient.get<MemberDetailDto>(`/members/${memberId}`),
    enabled: !!memberId,
  });
}

/** Mirrors the backend's member.GuarantorCandidateDto — deliberately minimal, see there. */
export interface GuarantorCandidateDto {
  id: string;
  fullName: string;
  department: string;
}

/** Mirrors the backend's member.MemberSummary. */
export interface MemberSummaryDto {
  id: string;
  nationalId: string;
  employeeId: string;
  fullName: string;
  department: string;
  position: string;
  status: string;
  dateJoined: string;
  savingsBalanceRwf: number;
  roles: string[];
  monthlySalaryRwf: number;
  committeeChair: boolean;
}

/**
 * Staff-only (SECRETARY/ORG_ADMIN). GET /members is paginated with no "get
 * all" mode — every staff page that wants the full roster (matching the
 * mock's assume-everything-fits-in-memory shape) asks for one large page
 * instead. Fine at this org scale; would need real pagination UI to change.
 */
export function useMembers(search?: string) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["members", search ?? ""],
    queryFn: () =>
      apiClient.get<PageResponse<MemberSummaryDto>>(
        `/members?size=500${search ? `&search=${encodeURIComponent(search)}` : ""}`
      ),
    select: (page) => page.content,
    enabled: !!accessToken,
  });
}

export interface CreateMemberInput {
  nationalId: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  monthlySalaryRwf: number;
}

export interface CreateMemberResult {
  member: MemberSummaryDto;
  /** Shown once — the backend can't retrieve it again (no invite-email flow yet). */
  temporaryPassword: string;
}

export function useCreateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMemberInput) => apiClient.post<CreateMemberResult>("/members", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
  });
}

export function useGuarantorCandidates() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["guarantor-candidates"],
    queryFn: () => apiClient.get<GuarantorCandidateDto[]>("/members/guarantor-candidates"),
    enabled: !!accessToken,
  });
}

/** ORG_ADMIN only — replaces the member's full role set (MEMBER is always kept server-side even if omitted). */
export function useUpdateMemberRoles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, roles }: { memberId: string; roles: Role[] }) =>
      apiClient.put<MemberDetailDto>(`/members/${memberId}/roles`, { roles }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["member-detail"] });
    },
  });
}

/** ORG_ADMIN only. Only active<->suspended is a valid transition — the backend 409s anything else. */
export function useUpdateMemberStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, status }: { memberId: string; status: MemberStatus }) =>
      apiClient.post<MemberDetailDto>(`/members/${memberId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["member-detail"] });
    },
  });
}

/**
 * ORG_ADMIN only. Promoting someone (chair: true) requires they already hold
 * the loan-committee role (409 otherwise — assign that role first) and
 * demotes whoever currently holds it, since the backend enforces at most one
 * chair per organization. See docs/DECISIONS.md.
 */
export function useSetCommitteeChair() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, chair }: { memberId: string; chair: boolean }) =>
      apiClient.put<MemberDetailDto>(`/members/${memberId}/committee-chair`, { chair }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["member-detail"] });
    },
  });
}
