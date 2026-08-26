import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import type { AuditLogEntry } from "@/lib/types";

/** Mirrors the backend's audit.AuditLogDto. */
interface AuditLogDto {
  id: string;
  organizationId: string | null;
  actorName: string;
  action: string;
  target: string;
  occurredAt: string;
}

/**
 * ORG_ADMIN/SUPER_ADMIN only. An ORG_ADMIN is always forced server-side to
 * their own org, regardless of any filter this hook might otherwise pass —
 * see `AuditLogController`. Only `org-admin/Dashboard.tsx` consumes this so
 * far; Super Admin's platform-wide audit log view is a later phase.
 */
export function useOrgAuditLog() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const query = useQuery({
    queryKey: ["audit-log", "mine"],
    queryFn: () => apiClient.get<AuditLogDto[]>("/audit-logs"),
    enabled: !!accessToken,
  });

  const entries: AuditLogEntry[] | undefined = query.data?.map((dto) => ({
    id: dto.id,
    actor: dto.actorName,
    action: dto.action,
    target: dto.target,
    date: dto.occurredAt,
    organizationId: dto.organizationId ?? "",
  }));

  return { ...query, data: entries };
}
