import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export function verifyEmail(token: string) {
  return apiClient.post<void>("/auth/verify-email", { token });
}

/** 409s if the caller's account is already verified — surfaced via ApiError. */
export function useResendVerification() {
  return useMutation({
    mutationFn: () => apiClient.post<void>("/auth/resend-verification"),
  });
}
