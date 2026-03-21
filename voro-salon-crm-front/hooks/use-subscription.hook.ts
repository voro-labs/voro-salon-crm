import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { API_CONFIG } from "@/lib/api"
import type { TenantSubscriptionDto } from "@/types/subscription.interface"

export function useSubscription() {
  const { data: subscription, isLoading, mutate } = useSWR<TenantSubscriptionDto>(
    API_CONFIG.ENDPOINTS.SUBSCRIPTION_ME,
    fetcher
  )

  const now = new Date()
  const trialEndsAt = subscription?.trialEndsAt ? new Date(subscription.trialEndsAt) : null
  const status = subscription?.status
  const isTrialExpired =
    (status === "Trial" || status === (1 as any)) && trialEndsAt !== null && trialEndsAt < now
  const isInactive = status === "Inactive" || status === (2 as any)
  const isPaywalled = isTrialExpired || isInactive

  const trialDaysLeft = trialEndsAt && trialEndsAt > now
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
