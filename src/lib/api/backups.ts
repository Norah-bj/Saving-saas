import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import type { BackupRecord } from "@/lib/types";

/** Mirrors the backend's backup.BackupDto. */
interface BackupDto {
  id: string;
  organizationId: string | null;
  label: string;
  type: "manual" | "scheduled";
  sizeMb: number;
  createdBy: string;
  createdAt: string;
}

function adaptBackup(dto: BackupDto): BackupRecord {
  return {
    id: dto.id,
    // Null only for a platform-wide record (a super-admin's own manual
    // backup) — the mock's type uses the literal "platform" sentinel here.
    organizationId: dto.organizationId ?? "platform",
    label: dto.label,
    date: dto.createdAt,
    sizeMb: dto.sizeMb,
    type: dto.type,
  };
}

/** ORG_ADMIN sees only their own org's records; SUPER_ADMIN sees every record, platform-wide ones included. */
export function useBackups() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const query = useQuery({
    queryKey: ["backups"],
    queryFn: () => apiClient.get<BackupDto[]>("/backups"),
    enabled: !!accessToken,
  });
  return { ...query, data: query.data?.map(adaptBackup) };
}

/**
 * Metadata only — there's no real pg_dump/restore behind this, matching the
 * mock exactly (its own "Restore" button is local UI state, no store
 * action). See docs/KNOWN_ISSUES.md.
 */
export function useCreateBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (label: string) => apiClient.post<BackupDto>("/backups", { label }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["backups"] }),
  });
}
