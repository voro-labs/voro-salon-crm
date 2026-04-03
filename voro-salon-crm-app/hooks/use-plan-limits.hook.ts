import useSWR from "swr"
import { API_CONFIG } from "../lib/api"
import { fetcher } from "../lib/fetcher"
import { useAuth } from "../contexts/auth.context"

interface SubscriptionPlanDto {
  maxEmployees: number
  maxClients: number
  name: string
  hasWhatsAppBot: boolean
  hasAnamnesis: boolean
  hasBooking: boolean
  hasFinancial: boolean
}

interface TenantSubscriptionDto {
  plan: SubscriptionPlanDto
}

export function usePlanLimits() {
  const { isAuthenticated } = useAuth()
  const { data: subscription } = useSWR<TenantSubscriptionDto>(
    isAuthenticated ? API_CONFIG.ENDPOINTS.SUBSCRIPTION_ME : null,
    fetcher
  )

  const plan = subscription?.plan

  return {
    maxClients: plan?.maxClients ?? -1,
    maxEmployees: plan?.maxEmployees ?? -1,
    planName: plan?.name ?? "",
    hasWhatsAppBot: plan?.hasWhatsAppBot ?? false,
    hasAnamnesis: plan?.hasAnamnesis ?? false,
    hasBooking: plan?.hasBooking ?? false,
    hasFinancial: plan?.hasFinancial ?? false,
    isLoaded: !!plan,
  }
}
