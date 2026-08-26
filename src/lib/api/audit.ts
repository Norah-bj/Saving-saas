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

/**
 * SUPER_ADMIN only — every audit entry across every org, plus platform-level
 * (`organizationId: null`) rows. `super-admin/AuditLogs.tsx` filters by org
 * client-side over this full list, same as the mock always did.
 */
export function usePlatformAuditLog() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const query = useQuery({
    queryKey: ["audit-log", "platform"],
    queryFn: () => apiClient.get<AuditLogDto[]>("/audit-logs"),
    enabled: !!accessToken,
  });

  const entries: AuditLogEntry[] | undefined = query.data?.map((dto) => ({
    id: dto.id,
    actor: dto.actorName,
    action: dto.action,
    target: dto.target,
    date: dto.occurredAt,
    // The mock uses the literal "platform" sentinel for platform-level rows;
    // the backend returns a real null.
    organizationId: dto.organizationId ?? "platform",
  }));

  return { ...query, data: entries };
}
