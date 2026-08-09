import { useSessionStore } from "@/lib/store/session-store";
import { useDataStore } from "@/lib/store/data-store";

export function useCurrentUser() {
  const userId = useSessionStore((s) => s.userId);
  const activeRole = useSessionStore((s) => s.activeRole);
  const members = useDataStore((s) => s.members);
  const user = members.find((m) => m.id === userId) ?? null;
  return { user, activeRole };
}
