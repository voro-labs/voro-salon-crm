import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { getAuthToken, removeAuthToken, setAuthToken, getRefreshToken, setRefreshToken, removeRefreshToken, API_CONFIG } from "lib/api"
import { AuthDto } from "types/DTOs/auth.interface"
import { jwtDecode } from "jwt-decode"
import * as SecureStore from "expo-secure-store"
import { AppState, type AppStateStatus, DeviceEventEmitter } from "react-native"

// Tipo do payload esperado no token JWT
interface JwtPayload {
  userId: string
  firstName?: string
  lastName?: string
  userName: string
  email: string
  roles?: string
  TenantId?: string
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

  // Aplica um JWT válido ao estado do usuário — nível de componente para reusar em listeners
  const applyToken = useCallback(async (jwt: string, refresh?: string) => {
    const storedTenantsStr = await SecureStore.getItemAsync("user_tenants")
    const storedTenants = storedTenantsStr ? JSON.parse(storedTenantsStr) : []
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
      currentTenantId: decoded.TenantId,
    })
  }, [])

  // Tenta renovar o token silenciosamente usando o refresh token
  const attemptSilentRefresh = useCallback(async (): Promise<boolean> => {
    const refreshToken = await getRefreshToken()
    if (!refreshToken) return false
    const expiredToken = await getAuthToken()
    try {
      const res = await fetch(`${API_CONFIG.BASE_API_URL}${API_CONFIG.ENDPOINTS.REFRESH_TOKEN}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: expiredToken ?? "", refreshToken }),
      })
      const data = await res.json()
      if (res.ok && !data.hasError && data.data?.token) {
        const newToken = data.data.token
        const newRefresh = data.data.refreshToken
        await setAuthToken(newToken)
        if (newRefresh) await setRefreshToken(newRefresh)
        await applyToken(newToken, newRefresh || refreshToken)
        return true
      }
    } catch {}
    return false
  }, [applyToken])

  useEffect(() => {
    const checkAuth = async () => {
      const token = await getAuthToken()

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
          await applyToken(token, refreshToken)
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

    // Re-verifica token quando app volta ao primeiro plano
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState !== "active") return
      const token = await getAuthToken()
      if (!token) {
        await attemptSilentRefresh()
        return
      }
      try {
        const decoded = jwtDecode<JwtPayload>(token)
        if (decoded.exp * 1000 < Date.now()) {
          const refreshed = await attemptSilentRefresh()
          if (!refreshed) {
            await removeAuthToken()
            await removeRefreshToken()
            setUser(null)
          }
        }
      } catch {
        await attemptSilentRefresh()
      }
    }

    checkAuth()

    const appStateSub = AppState.addEventListener("change", handleAppStateChange)

    // Deslogar quando apiCall emite auth:logout (refresh falhou mid-session)
    const logoutListener = DeviceEventEmitter.addListener("auth:logout", () => {
      removeAuthToken()
      removeRefreshToken()
      SecureStore.deleteItemAsync("user_tenants")
      setUser(null)
    })

    // Atualiza user.token quando apiCall renova o token via interceptor 401
    const tokenRefreshedListener = DeviceEventEmitter.addListener("auth:tokenRefreshed", (newToken: string) => {
      getRefreshToken().then((rt) => applyToken(newToken, rt || undefined))
    })

    return () => {
      appStateSub.remove()
      logoutListener.remove()
      tokenRefreshedListener.remove()
    }
  }, [applyToken, attemptSilentRefresh])

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
        tenants: tenants || [],
        currentTenantId: decoded.TenantId,
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
      const { apiCall, API_CONFIG, getAuthToken, setAuthToken } = await import("lib/api")

      // Re-sync token to SecureStore if a concurrent 401 handler cleared it while user is still authenticated
      const storedToken = await getAuthToken()
      if (!storedToken && user?.token) {
        await setAuthToken(user.token)
      }

      const result = await apiCall<AuthDto>(`${API_CONFIG.ENDPOINTS.SWITCH_TENANT}/${tenantId}`, {
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
