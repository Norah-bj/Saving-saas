import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export interface CreateMeetingInput {
  title: string;
  date: string;
  time: string;
  location: string;
  agenda: string[];
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMeetingInput) => apiClient.post<Meeting>("/meetings", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meetings"] }),
  });
}

export function useRecordMinutes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, minutesSummary }: { id: string; minutesSummary: string }) =>
      apiClient.post<Meeting>(`/meetings/${id}/minutes`, { minutesSummary }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meetings"] }),
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

export interface CreateAnnouncementInput {
  title: string;
  body: string;
  priority: "normal" | "important" | "urgent";
  audience: "all" | "members" | "admins";
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAnnouncementInput) => apiClient.post<Announcement>("/announcements", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements"] }),
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

export interface CreateDocumentInput {
  name: string;
  category: "constitution" | "policy" | "report" | "minutes" | "form";
  fileType: "pdf" | "docx" | "xlsx";
  sizeKb: number;
  visibility: "all" | "admins";
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDocumentInput) => apiClient.post<DocumentItem>("/documents", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });
}
