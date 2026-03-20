import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import * as SecureStore from "expo-secure-store"
import { API_CONFIG, secureApiCall } from "lib/api"

interface TenantTheme {
  primaryColor: string
  secondaryColor: string
  reload: () => Promise<void>
}

const DEFAULT_COLORS = {
  primaryColor: "#7c3aed",
  secondaryColor: "#a78bfa",
}

const TenantThemeContext = createContext<TenantTheme>({
  ...DEFAULT_COLORS,
  reload: async () => {},
})

const STORE_KEY = "voro:tenantTheme"

// Setter global — permite que refreshTenantTheme atualize o contexto de fora do React
let _setColors: ((c: typeof DEFAULT_COLORS) => void) | null = null

export function TenantThemeProvider({ children }: { children: ReactNode }) {
  const [colors, setColors] = useState(DEFAULT_COLORS)

  useEffect(() => {
    _setColors = setColors
    return () => { _setColors = null }
  }, [setColors])

  const loadTheme = async () => {
    try {
      const cached = await SecureStore.getItemAsync(STORE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        setColors({
          primaryColor: parsed.primaryColor ?? DEFAULT_COLORS.primaryColor,
          secondaryColor: parsed.secondaryColor ?? DEFAULT_COLORS.secondaryColor,
        })
      }
    } catch {}

    try {
      const res = await secureApiCall<{ primaryColor: string | null; secondaryColor: string | null }>(
        API_CONFIG.ENDPOINTS.TENANT_ME,
        { method: "GET" }
      )
      if (!res.hasError && res.data) {
        const newColors = {
          primaryColor: res.data.primaryColor ?? DEFAULT_COLORS.primaryColor,
          secondaryColor: res.data.secondaryColor ?? DEFAULT_COLORS.secondaryColor,
        }
        setColors(newColors)
        await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(newColors))
      }
    } catch {}
  }

  useEffect(() => { loadTheme() }, [])

  return (
    <TenantThemeContext.Provider value={{ ...colors, reload: loadTheme }}>
      {children}
    </TenantThemeContext.Provider>
  )
}

export function useTenantTheme() {
  return useContext(TenantThemeContext)
}

export async function refreshTenantTheme(primaryColor: string | null, secondaryColor: string | null) {
  const newColors = {
    primaryColor: primaryColor ?? DEFAULT_COLORS.primaryColor,
    secondaryColor: secondaryColor ?? DEFAULT_COLORS.secondaryColor,
  }
  // Atualiza o contexto React imediatamente (reflete em todo o app)
  _setColors?.(newColors)
  try {
    await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(newColors))
  } catch {}
}
