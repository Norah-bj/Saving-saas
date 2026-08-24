import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import { useSessionStore } from "@/lib/store/session-store";
import { initials } from "@/lib/format";
import type { AppUser } from "@/lib/types";

/** Mirrors the backend's auth.MeResponse. */
interface MeResponse {
  id: string;
  organizationId: string | null;
  nationalId: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  status: AppUser["status"];
  roles: AppUser["roles"];
  committeeChair: boolean;
  monthlySalaryRwf: number;
  dateJoined: string;
  emailVerified: boolean;
}

/**
 * Full current-user profile, backed by a real GET /me call — the JWT/login
 * response only carries a lightweight summary (id, roles, fullName), not
 * enough for pages like Profile.tsx that need email/phone/department/etc.
 * `activeRole` stays separate (session-store.ts) since it's a client-only
 * "which workspace am I viewing" concern, not part of authentication.
 */
export function useCurrentUser() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const activeRole = useSessionStore((s) => s.activeRole);

  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiClient.get<MeResponse>("/me"),
    enabled: !!accessToken,
    staleTime: 60_000,
  });

  const user: AppUser | null = data
    ? {
        id: data.id,
        nationalId: data.nationalId,
        employeeId: data.employeeId,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        department: data.department,
        position: data.position,
        // Only null for a platform super-admin, which this workspace slice
        // doesn't cover yet — safe fallback until that's wired.
        organizationId: data.organizationId ?? "",
        roles: data.roles,
        status: data.status,
        dateJoined: data.dateJoined,
        avatarInitials: initials(data.fullName),
        monthlySalary: data.monthlySalaryRwf,
      }
    : null;

  // Not part of AppUser (which mirrors the mock's domain model, predating any
  // backend concept of email verification) — exposed alongside it instead.
  const emailVerified = data?.emailVerified ?? true;

  return { user, activeRole, isLoading, emailVerified };
}
