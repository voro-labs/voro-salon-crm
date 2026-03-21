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
  const isTrialExpired =
    subscription?.status === "Trial" && trialEndsAt !== null && trialEndsAt < now

  const trialDaysLeft = trialEndsAt && trialEndsAt > now
    ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return {
    subscription,
    isLoading,
    mutate,
    isTrialExpired,
    trialDaysLeft,
    trialEndsAt,
    isActive: subscription?.status === "Active",
    isTrial: subscription?.status === "Trial",
    plan: subscription?.plan,
  }
}
