import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role } from "@/lib/types";

/**
 * Which of the current user's roles they're currently viewing the app as —
 * decoupled from authentication (see auth-store.ts). A user can hold
 * multiple roles and switch workspaces from the sidebar without logging out.
 */
interface SessionState {
  activeRole: Role | null;
  switchRole: (role: Role) => void;
  clearRole: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      activeRole: null,
      switchRole: (role) => set({ activeRole: role }),
      clearRole: () => set({ activeRole: null }),
    }),
    { name: "ikc-session" }
  )
);
