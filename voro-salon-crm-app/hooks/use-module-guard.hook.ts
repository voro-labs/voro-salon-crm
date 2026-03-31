import { useEffect } from "react"
import { useRouter } from "expo-router"
import { useAuth } from "contexts/auth.context"
import useSWR from "swr"
import { API_CONFIG } from "lib/api"
import { fetcher } from "lib/fetcher"

const MODULE_IDS: Record<string, number> = {
  clients: 1,
  appointments: 2,
  services: 3,
  finance: 5,
}

/**
 * Verifica se o módulo da tela atual está habilitado.
 * Redireciona para home caso seja desativado (inclusive via app web).
 */
export function useModuleGuard(tabName: keyof typeof MODULE_IDS) {
  const { user } = useAuth()
  const router = useRouter()
  const moduleId = MODULE_IDS[tabName]
  const { data: modules } = useSWR(API_CONFIG.ENDPOINTS.TENANT_MODULES, fetcher)

  const roleNames = user?.roles?.map((r: any) => r.name) ?? []
  const isOwner = roleNames.includes("Owner")
  const isSalonOwner = roleNames.includes("SalonOwner") || isOwner

  useEffect(() => {
    if (isSalonOwner) return // Bypasses check for owners
    if (!modules || !moduleId) return
    const mod = (modules as any[]).find((m) => m.module === moduleId)
    if (mod && !mod.isEnabled) {
      router.replace("/")
    }
  }, [modules, moduleId, router, isSalonOwner])
}
