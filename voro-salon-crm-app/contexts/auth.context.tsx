import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { getAuthToken, removeAuthToken, setAuthToken, getRefreshToken, setRefreshToken, removeRefreshToken, API_CONFIG, secureApiCall } from "lib/api"
import { AuthDto } from "types/DTOs/auth.interface"
import { jwtDecode } from "jwt-decode"
import * as SecureStore from "expo-secure-store"
import { Platform, AppState, type AppStateStatus, DeviceEventEmitter } from "react-native"
import { router } from "expo-router"
import * as Notifications from "expo-notifications"
import Constants from "expo-constants"

// Tipo do payload esperado no token JWT
interface JwtPayload {
  userId: string
  firstName?: string
  lastName?: string
  userName: string
  email: string
  roles?: string
  TenantId?: string
  twoFactorEnabled?: string
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

const PUSH_TOKEN_KEY = "push_token"

const isExpoGo = Constants.appOwnership === "expo"

async function registerPushTokenInternal() {
  try {
    if (isExpoGo) return

    const existingToken = await SecureStore.getItemAsync(PUSH_TOKEN_KEY)
    if (existingToken) return

    const { status } = await Notifications.requestPermissionsAsync()
    if (status !== "granted") return

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      })
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId })
    const token = tokenData.data

    const result = await secureApiCall(API_CONFIG.ENDPOINTS.PUSH_TOKENS, {
      method: "POST",
      body: JSON.stringify({ token, platform: Platform.OS }),
    })

    if (!result.hasError) {
      await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token)
    }
  } catch (err) {
    console.error("Erro ao registrar push token:", err)
  }
}

async function unregisterPushTokenInternal() {
  try {
    const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY)
    if (!token) return

    await secureApiCall(`${API_CONFIG.ENDPOINTS.PUSH_TOKENS}/${encodeURIComponent(token)}`, {
      method: "DELETE",
    })

    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY)
  } catch (err) {
    console.error("Erro ao remover push token:", err)
  }
}

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
      twoFactorEnabled: decoded.twoFactorEnabled === "True",
      token: jwt,
      refreshToken: refresh,
      tenants: storedTenants,
      currentTenantId: decoded.TenantId,
    })
  }, [])



  useEffect(() => {
    const checkAuth = async () => {
      console.log("[AuthContext] Iniciando checkAuth...")
      const { tokenManager } = await import("lib/api")
      
      try {
        const token = await tokenManager.getValidToken()

        if (!token) {
          console.log("[AuthContext] Nenhum token válido encontrado no checkAuth.")
          setUser(null)
          return
        }

        console.log("[AuthContext] Token válido encontrado, aplicando ao estado...")
        const decoded = jwtDecode<JwtPayload>(token)
        const refreshToken = (await getRefreshToken()) || undefined
        await applyToken(token, refreshToken)
      } catch (err) {
        console.error("[AuthContext] Erro fatal no checkAuth:", err)
        setUser(null)
      } finally {
        console.log("[AuthContext] checkAuth finalizado, liberando loading.")
        setLoading(false)
      }
    }

    // Re-verifica token quando app volta ao primeiro plano
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState !== "active") return
      console.log("[AuthContext] App voltou ao primeiro plano, verificando sessão...")
      
      const { tokenManager } = await import("lib/api")
      const token = await tokenManager.getValidToken()
      
      if (!token) {
        console.warn("[AuthContext] Sessão perdida durante background/foreground.")
        setUser(null)
        return
      }
      
      const refreshToken = (await getRefreshToken()) || undefined
      await applyToken(token, refreshToken)
      console.log("[AuthContext] Sessão revalidada com sucesso no foreground.")
    }

    checkAuth()

    const appStateSub = AppState.addEventListener("change", handleAppStateChange)

    // Deslogar quando apiCall emite auth:logout (refresh falhou mid-session)
    const logoutListener = DeviceEventEmitter.addListener("auth:logout", async () => {
      await unregisterPushTokenInternal()
      await removeAuthToken()
      await removeRefreshToken()
      await SecureStore.deleteItemAsync("user_tenants")
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
  }, [applyToken])

  // Registra push token automaticamente ao autenticar
  useEffect(() => {
    if (user) {
      registerPushTokenInternal()
    }
  }, [user?.userId])

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
        twoFactorEnabled: decoded.twoFactorEnabled === "True",
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
    await unregisterPushTokenInternal()
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
        // Reseta a pilha de navegação para evitar que rotas do salão anterior sejam restauradas
        router.replace("/(tabs)/")
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
