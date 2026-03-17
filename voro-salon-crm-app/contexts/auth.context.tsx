import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { getAuthToken, removeAuthToken, setAuthToken, getRefreshToken, setRefreshToken, removeRefreshToken, API_CONFIG } from "lib/api"
import { AuthDto } from "types/DTOs/auth.interface"
import { jwtDecode } from "jwt-decode"
import * as SecureStore from "expo-secure-store"
import { DeviceEventEmitter } from "react-native"

// Tipo do payload esperado no token JWT
interface JwtPayload {
  userId: string
  firstName?: string
  lastName?: string
  userName: string
  email: string
  roles?: string
  exp: number
}

// Tipo do contexto
export interface AuthContextType {
  user: AuthDto | null
  isAuthenticated: boolean
  isLoading: boolean
  loading: boolean
  login: (token: string, refreshToken?: string, tenants?: any[]) => Promise<void>
  logout: () => Promise<void>
  switchTenant: (tenantId: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthDto | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const token = await getAuthToken()
      const storedTenantsStr = await SecureStore.getItemAsync("user_tenants")
      const storedTenants = storedTenantsStr ? JSON.parse(storedTenantsStr) : []

      // Aplica um JWT válido ao estado do usuário
      const applyToken = (jwt: string, refresh?: string) => {
        const decoded = jwtDecode<JwtPayload>(jwt)
        setUser({
          userId: decoded.userId,
          firstName: decoded.firstName,
          lastName: decoded.lastName,
          userName: decoded.userName,
          email: decoded.email,
          roles: decoded.roles?.split(",").map((role) => ({ id: "", name: role })) || [],
          token: jwt,
          refreshToken: refresh,
          tenants: storedTenants,
        })
      }

      // Tenta renovar o token silenciosamente usando o refresh token
      const attemptSilentRefresh = async (): Promise<boolean> => {
        const refreshToken = await getRefreshToken()
        if (!refreshToken) return false
        try {
          const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REFRESH_TOKEN}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          })
          const data = await res.json()
          if (res.ok && !data.hasError && data.data?.token) {
            const newToken = data.data.token
            const newRefresh = data.data.refreshToken
            await setAuthToken(newToken)
            if (newRefresh) await setRefreshToken(newRefresh)
            applyToken(newToken, newRefresh || refreshToken)
            return true
          }
        } catch {}
        return false
      }

      if (!token) {
        // Sem access token — tenta refresh antes de deslogar
        const refreshed = await attemptSilentRefresh()
        if (!refreshed) setUser(null)
        setLoading(false)
        return
      }

      try {
        const decoded = jwtDecode<JwtPayload>(token)
        const isExpired = decoded.exp * 1000 < Date.now()

        if (isExpired) {
          // Token expirado — tenta refresh silencioso
          const refreshed = await attemptSilentRefresh()
          if (!refreshed) {
            await removeAuthToken()
            await removeRefreshToken()
            setUser(null)
          }
        } else {
          // Token ainda válido — usa normalmente
          const refreshToken = (await getRefreshToken()) || undefined
          applyToken(token, refreshToken)
        }
      } catch (err) {
        // Token malformado — tenta refresh antes de deslogar
        console.error("Erro ao decodificar token:", err)
        const refreshed = await attemptSilentRefresh()
        if (!refreshed) {
          await removeAuthToken()
          await removeRefreshToken()
          setUser(null)
        }
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    const listener = DeviceEventEmitter.addListener("auth:logout", () => {
      setUser(null)
    })

    return () => {
      listener.remove()
    }
  }, [])

  const login = async (token: string, refreshToken?: string, tenants?: any[]) => {
    await setAuthToken(token)

    if (refreshToken) {
      await setRefreshToken(refreshToken)
    }

    if (tenants) {
      await SecureStore.setItemAsync("user_tenants", JSON.stringify(tenants))
    }

    try {
      const decoded = jwtDecode<JwtPayload>(token)

      const userData: AuthDto = {
        userId: decoded.userId,
        firstName: decoded.firstName,
        lastName: decoded.lastName,
        userName: decoded.userName,
        email: decoded.email,
        roles: decoded.roles?.split(",").map(role => ({ id: "", name: role })) || [],
        token: token,
        refreshToken: refreshToken,
        tenants: tenants || []
      }

      setUser(userData)
    } catch (err) {
      console.error("Erro ao decodificar token:", err)
      await removeAuthToken()
      await removeRefreshToken()
      setUser(null)
    }
  }

  const logout = async () => {
    setUser(null)
    await removeAuthToken()
    await removeRefreshToken()
    await SecureStore.deleteItemAsync("user_tenants")
  }

  const switchTenant = async (tenantId: string) => {
    try {
      const { secureApiCall, API_CONFIG } = await import("lib/api")
      const result = await secureApiCall<AuthDto>(`${API_CONFIG.ENDPOINTS.SWITCH_TENANT}/${tenantId}`, {
        method: "POST"
      })

      if (result.hasError) throw new Error(result.message ?? "Erro ao trocar de salão")

      if (result.data?.token) {
        await login(result.data.token, result.data.refreshToken, result.data.tenants)
      }
    } catch (err) {
      console.error("Erro ao trocar de salão:", err)
      throw err
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      loading,
      isLoading: loading,
      login,
      logout,
      switchTenant
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
