import { useEffect, useCallback } from "react"
import { useRouter, useFocusEffect } from "expo-router"
import { useAuth } from "contexts/auth.context"
import useSWR from "swr"
import { API_CONFIG } from "lib/api"
import { fetcher } from "lib/fetcher"
import { usePlanLimits } from "hooks/use-plan-limits.hook"

const MODULE_IDS: Record<string, number> = {
  clients: 1,
  appointments: 2,
  services: 3,
  employees: 4,
  finance: 5,
  whatsapp: 9,
}

/**
 * Verifica se o módulo da tela atual está habilitado.
 * Redireciona para home caso seja desativado (inclusive via app web).
 */
export function useModuleGuard(tabName: keyof typeof MODULE_IDS) {
  const { user } = useAuth()
  const router = useRouter()
  const { hasBooking, hasFinancial, hasWhatsAppBot, isLoaded } = usePlanLimits()
  const moduleId = MODULE_IDS[tabName]
  const { data: modules } = useSWR(API_CONFIG.ENDPOINTS.TENANT_MODULES, fetcher)

  const roleNames = user?.roles?.map((r: any) => r.name) ?? []
  const isOwner = roleNames.includes("Owner")
  const isSalonOwner = roleNames.includes("SalonOwner") || isOwner
  const isSalonEmployee = roleNames.includes("SalonEmployee")

  useFocusEffect(
    useCallback(() => {
      // SalonEmployee bypassa todas as restrições de módulo
      if (isSalonEmployee) return

      // 1. Hard restrictions based on plan limits (cannot be overridden by SalonOwner role)
      if (!isLoaded) return
      if (tabName === "appointments" && !hasBooking) { router.replace("/"); return }
      if (tabName === "finance" && !hasFinancial) { router.replace("/"); return }
      if (tabName === "whatsapp" && !hasWhatsAppBot) { router.replace("/"); return }

      // 2. Soft restrictions based on module enablement (can be overridden by SalonOwner role)
      if (isSalonOwner) return // Bypasses check for owners
      if (!modules || !moduleId) return
      const mod = (modules as any[]).find((m) => m.module === moduleId)
      if (mod && !mod.isEnabled) {
        router.replace("/")
      }
    }, [modules, moduleId, router, isSalonOwner, isSalonEmployee, tabName, hasBooking, hasFinancial, hasWhatsAppBot, isLoaded])
  )
}
