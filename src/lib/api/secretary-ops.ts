import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import type { Meeting, Announcement, DocumentItem } from "@/lib/types";

// Field names already match the frontend's Meeting/Announcement/DocumentItem
// types exactly — no adapter needed, unlike savings/loans.

export function useMeetings() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["meetings"],
    queryFn: () => apiClient.get<Meeting[]>("/meetings"),
    enabled: !!accessToken,
  });
}

export function useAnnouncements() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["announcements"],
    queryFn: () => apiClient.get<Announcement[]>("/announcements"),
    enabled: !!accessToken,
  });
}

export function useDocuments() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["documents"],
    queryFn: () => apiClient.get<DocumentItem[]>("/documents"),
    enabled: !!accessToken,
  });
}
