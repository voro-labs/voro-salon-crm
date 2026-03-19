import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { API_CONFIG } from "@/lib/api"
import type { TenantSubscriptionDto } from "@/types/subscription.interface"

export function usePlanLimits() {
  const { data: subscription } = useSWR<TenantSubscriptionDto>(
    API_CONFIG.ENDPOINTS.SUBSCRIPTION_ME,
    fetcher
  )

  const plan = subscription?.plan

  return {
    maxClients: plan?.maxClients ?? -1,
    maxEmployees: plan?.maxEmployees ?? -1,
    planName: plan?.name ?? "",
    isLoaded: !!plan,
  }
}
