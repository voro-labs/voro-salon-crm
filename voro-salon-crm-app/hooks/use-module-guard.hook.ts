import { useEffect } from "react"
import { useRouter } from "expo-router"
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
  const router = useRouter()
  const moduleId = MODULE_IDS[tabName]
  const { data: modules } = useSWR(API_CONFIG.ENDPOINTS.TENANT_MODULES, fetcher)

  useEffect(() => {
    if (!modules || !moduleId) return
    const mod = (modules as any[]).find((m) => m.module === moduleId)
    if (mod && !mod.isEnabled) {
      router.replace("/")
    }
  }, [modules, moduleId, router])
}
