import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import * as SecureStore from "expo-secure-store"
import { API_CONFIG, secureApiCall } from "lib/api"

interface TenantTheme {
  primaryColor: string | null
  secondaryColor: string | null
}

const DEFAULT_THEME: TenantTheme = {
  primaryColor: "#7c3aed",
  secondaryColor: "#a78bfa",
}

const TenantThemeContext = createContext<TenantTheme>(DEFAULT_THEME)

const STORE_KEY = "voro:tenantTheme"

export function TenantThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<TenantTheme>(DEFAULT_THEME)

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const cached = await SecureStore.getItemAsync(STORE_KEY)
        if (cached) {
          const parsed = JSON.parse(cached) as TenantTheme
          setTheme(parsed)
        }
      } catch {}

      try {
        const res = await secureApiCall<{ primaryColor: string | null; secondaryColor: string | null }>(
          API_CONFIG.ENDPOINTS.TENANT_ME,
          { method: "GET" }
        )
        if (!res.hasError && res.data) {
          const newTheme: TenantTheme = {
            primaryColor: res.data.primaryColor ?? DEFAULT_THEME.primaryColor,
            secondaryColor: res.data.secondaryColor ?? DEFAULT_THEME.secondaryColor,
          }
          setTheme(newTheme)
          await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(newTheme))
        }
      } catch {}
    }

    loadTheme()
  }, [])

  return (
    <TenantThemeContext.Provider value={theme}>
      {children}
    </TenantThemeContext.Provider>
  )
}

export function useTenantTheme() {
  return useContext(TenantThemeContext)
}

export async function refreshTenantTheme(primaryColor: string | null, secondaryColor: string | null) {
  try {
    await SecureStore.setItemAsync(STORE_KEY, JSON.stringify({ primaryColor, secondaryColor }))
  } catch {}
}
