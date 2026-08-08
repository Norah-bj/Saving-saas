import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role } from "@/lib/types";

interface SessionState {
  userId: string | null;
  activeRole: Role | null;
  login: (userId: string, role: Role) => void;
  switchRole: (role: Role) => void;
  logout: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      userId: null,
      activeRole: null,
      login: (userId, role) => set({ userId, activeRole: role }),
      switchRole: (role) => set({ activeRole: role }),
      logout: () => set({ userId: null, activeRole: null }),
    }),
    { name: "ikc-session" }
  )
);
