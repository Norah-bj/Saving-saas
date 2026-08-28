import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import type { RolePolicy } from "@/lib/types";

/** Mirrors the backend's policy.PolicyDocumentDto. */
interface PolicyDocumentDto {
  id: string;
  title: string;
  category: RolePolicy["category"];
  summary: string;
  body: string[];
  updatedAt: string;
}

/**
 * Any authenticated member of the org can read their own org's policy text —
 * read-only reference content, the same set seeded for every organization.
 * See docs/DECISIONS.md and docs/KNOWN_ISSUES.md.
 */
export function usePolicies() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const query = useQuery({
    queryKey: ["policies"],
    queryFn: () => apiClient.get<PolicyDocumentDto[]>("/policies"),
    enabled: !!accessToken,
  });

  const policies: RolePolicy[] | undefined = query.data?.map((dto) => ({
    id: dto.id,
    title: dto.title,
    category: dto.category,
    summary: dto.summary,
    body: dto.body,
    updatedAt: dto.updatedAt,
  }));

  return { ...query, data: policies };
}
