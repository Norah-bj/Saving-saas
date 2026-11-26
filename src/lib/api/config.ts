import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

/**
 * Mirrors GET /api/v1/config. `paymentsMode` is "demo" while no real payment
 * provider (MTN MoMo, Airtel Money) is connected: member self-service deposits
 * and share purchases work for testing but move no real money. "disabled"
 * means members can't put money in themselves; staff record payments they
 * actually received. See backend common/PaymentsMode.
 */
export interface PublicConfig {
  paymentsMode: "demo" | "disabled" | string;
}

export function usePublicConfig() {
  return useQuery({
    queryKey: ["public-config"],
    queryFn: () => apiClient.get<PublicConfig>("/config"),
    staleTime: 5 * 60 * 1000,
  });
}
