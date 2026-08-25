import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import type { PageResponse } from "@/lib/api/client";

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
