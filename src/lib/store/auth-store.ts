import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiClient } from "@/lib/api/client";
import type { Role } from "@/lib/types";

/** Mirrors the backend's AuthResponse (auth.AuthResponse). */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

/** Mirrors AuthResponse.UserSummary — the lightweight claims carried by the JWT. */
export interface AuthUser {
  id: string;
  organizationId: string | null;
  fullName: string;
  roles: Role[];
  committeeChair: boolean;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  setTokens: (response: AuthResponse) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      user: null,

      login: async (email, password) => {
        const response = await apiClient.post<AuthResponse>("/auth/login", { email, password });
        get().setTokens(response);
        return response.user;
      },

      logout: () => {
        const { refreshToken } = get();
        set({ accessToken: null, refreshToken: null, expiresAt: null, user: null });
        if (refreshToken) {
          // Best-effort — the user is logged out client-side regardless of
          // whether this succeeds.
          apiClient.post("/auth/logout", { refreshToken }).catch(() => {});
        }
      },

      setTokens: (response) => {
        set({
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          expiresAt: Date.now() + response.expiresIn * 1000,
          user: response.user,
        });
      },
    }),
    { name: "ikc-auth" }
  )
);
