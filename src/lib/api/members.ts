import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";

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

export function useGuarantorCandidates() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["guarantor-candidates"],
    queryFn: () => apiClient.get<GuarantorCandidateDto[]>("/members/guarantor-candidates"),
    enabled: !!accessToken,
  });
}
