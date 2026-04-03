import useSWR from "swr"
import { API_CONFIG } from "../lib/api"
import { fetcher } from "../lib/fetcher"
import { useAuth } from "../contexts/auth.context"

interface SubscriptionPlanDto {
  id: string
  name: string
  maxEmployees: number
  maxClients: number
  hasFinancial: boolean
  hasAnamnesis: boolean
  monthlyPrice: number
}

interface TenantSubscriptionDto {
  status: string
  trialEndsAt: string | null
  nextPaymentAt: string | null
  lastPaymentAt: string | null
  plan: SubscriptionPlanDto
}

export function useSubscription() {
  const { isAuthenticated } = useAuth()
  const { data: subscription, isLoading, mutate } = useSWR<TenantSubscriptionDto>(
    isAuthenticated ? API_CONFIG.ENDPOINTS.SUBSCRIPTION_ME : null,
    fetcher
  )

  const now = new Date()
  const trialEndsAt = subscription?.trialEndsAt ? new Date(subscription.trialEndsAt) : null
  const status = subscription?.status
  const isTrialExpired =
    (status === "Trial" || status === (1 as any)) && trialEndsAt !== null && trialEndsAt < now
  const isInactive = status === "Inactive" || status === (2 as any)
  const isPaywalled = isTrialExpired || isInactive

  const trialDaysLeft =
    trialEndsAt && trialEndsAt > now
      ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0

  return {
    subscription,
    isLoading,
    mutate,
    isTrialExpired,
    isInactive,
    isPaywalled,
    trialDaysLeft,
    trialEndsAt,
    isActive: status === "Active" || status === (0 as any),
    isTrial: status === "Trial" || status === (1 as any),
    plan: subscription?.plan,
  }
}
