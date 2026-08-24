import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";

/** Mirrors the backend's notification.NotificationDto. Already scoped to "mine" server-side. */
export interface NotificationDto {
  id: string;
  title: string;
  body: string;
  type: "loan" | "meeting" | "announcement" | "savings" | "system";
  read: boolean;
  date: string;
}

export function useNotifications() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiClient.get<NotificationDto[]>("/notifications"),
    enabled: !!accessToken,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post<NotificationDto>(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<void>("/notifications/read-all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
