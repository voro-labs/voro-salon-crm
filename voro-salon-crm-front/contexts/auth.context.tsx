"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { getAuthToken, removeAuthToken, setAuthToken, getRefreshToken, setRefreshToken, removeRefreshToken, API_CONFIG, tokenManager } from "@/lib/api"
import { AuthDto } from "@/types/DTOs/auth.interface"
import { getEstablishmentTypeByHostname } from "@/lib/branding"
import { jwtDecode } from "jwt-decode"

// Cada tipo de estabelecimento tem seu próprio endereço, então o seletor mostra apenas
// os estabelecimentos do domínio acessado — uma conta pode ter salão e barbearia juntos.
// Itens sem o tipo (lista salva por uma versão anterior) são mantidos, e se nada
// corresponder devolvemos a lista inteira em vez de deixar o seletor vazio.
function tenantsOfCurrentDomain(tenants?: any[]) {
  if (!tenants?.length || typeof window === "undefined") return tenants ?? []

  const expectedType = getEstablishmentTypeByHostname(window.location.hostname)
  const ofDomain = tenants.filter(
    (t) => t?.establishmentType === undefined || t.establishmentType === expectedType
  )

  return ofDomain.length > 0 ? ofDomain : tenants
}

// Tipo do payload esperado no token JWT
interface JwtPayload {
  userId: string
  firstName?: string
  lastName?: string
  userName: string
  email: string
  roles?: string
  twoFactorEnabled?: string
  email_verified?: string
  exp: number
}

// Tipo do contexto
export interface AuthContextType {
  user: AuthDto | null
  login: (token: string, refreshToken?: string, tenants?: any[]) => void
  logout: () => void
  switchTenant: (tenantId: string) => Promise<void>
  refreshUser: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthDto | null>(null)
  const [loading, setLoading] = useState(true)

  // Escuta o evento disparado por apiCall quando o refresh token falha.
  // Isso garante que o estado React seja limpo imediatamente, sem depender
  // do window.location.href (que pode não disparar no Fast Refresh ou em loops).
  useEffect(() => {
    const handleAuthClear = () => {
      removeAuthToken()
      removeRefreshToken()
      setUser(null)
      setLoading(false)
    }
    window.addEventListener("voro:auth:clear", handleAuthClear)
    return () => window.removeEventListener("voro:auth:clear", handleAuthClear)
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken()
      const storedTenants = localStorage.getItem("user_tenants")
      let parsedTenants = []
      try {
        parsedTenants = storedTenants ? JSON.parse(storedTenants) : []
      } catch {
        localStorage.removeItem("user_tenants")
      }

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
          twoFactorEnabled: decoded.twoFactorEnabled === "True",
          emailConfirmed: decoded.email_verified?.toLowerCase() === "true",
          token: jwt,
          refreshToken: refresh,
          tenants: tenantsOfCurrentDomain(parsedTenants),
        })
      }

      // Tenta renovar o token silenciosamente usando o refresh token.
      // Quando há um expiredToken, delega ao tokenManager compartilhado para
      // evitar requests duplicados com o apiCall() que também pode estar tentando
      // renovar ao mesmo tempo (ex.: SWR disparando chamadas logo após o reload).
      const attemptSilentRefresh = async (expiredToken?: string): Promise<boolean> => {
        const refreshToken = getRefreshToken()
        if (!refreshToken) return false

        let newToken: string | null = null

        if (expiredToken) {
          // Usa o tokenManager para deduplicar com o refresh concorrente do apiCall().
          // O _doRefresh() do manager faz exatamente o mesmo fetch, mas com Promise única.
          newToken = await tokenManager.getValidToken()
        } else {
          // Sem access token nenhum: faz fetch direto (tokenManager retornaria null nesse caso).
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 8000)
          try {
            const res = await fetch(`${API_CONFIG.BASE_API_URL}${API_CONFIG.ENDPOINTS.REFRESH_TOKEN}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: "", refreshToken }),
              signal: controller.signal,
            })
            const data = await res.json()
            if (res.ok && !data.hasError && data.data?.token) {
              newToken = data.data.token
              setAuthToken(newToken!)
              if (data.data.refreshToken) setRefreshToken(data.data.refreshToken)
            }
          } catch {} finally {
            clearTimeout(timeoutId)
          }
        }

        if (!newToken) return false
        applyToken(newToken, getRefreshToken() || undefined)
        return true
      }

      if (!token) {
        // Sem access token — tenta refresh antes de deslogar
        try {
          const refreshed = await attemptSilentRefresh()
          if (!refreshed) setUser(null)
        } catch {
          setUser(null)
        } finally {
          setLoading(false)
        }
        return
      }

      try {
        const decoded = jwtDecode<JwtPayload>(token)
        const isExpired = decoded.exp * 1000 < Date.now()

        if (isExpired) {
          // Token expirado — passa o JWT expirado para o backend extrair o userId
          const refreshed = await attemptSilentRefresh(token)
          if (!refreshed) {
            removeAuthToken()
            removeRefreshToken()
            setUser(null)
          }
        } else {
          // Token ainda válido — garante cookie sincronizado e usa normalmente
          setAuthToken(token)
          applyToken(token, getRefreshToken() || undefined)
        }
      } catch (err) {
        // Token malformado — tenta refresh antes de deslogar
        console.error("Token inválido:", err)
        const refreshed = await attemptSilentRefresh(token)
        if (!refreshed) {
          removeAuthToken()
          removeRefreshToken()
          setUser(null)
        }
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = (token: string, refreshToken?: string, tenants?: any[]) => {
    setAuthToken(token);
    
    if (refreshToken) {
      setRefreshToken(refreshToken)
    }

    if (tenants) {
      localStorage.setItem("user_tenants", JSON.stringify(tenants))
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
        emailConfirmed: decoded.email_verified?.toLowerCase() === "true",
        token: token,
        refreshToken: refreshToken,
        tenants: tenantsOfCurrentDomain(tenants)
      }

      setUser(userData)
    } catch (err) {
      console.error("Erro ao decodificar token:", err)
      removeAuthToken()
      removeRefreshToken()
      setUser(null)
    }
  }

  const logout = () => {
    setUser(null)
    removeAuthToken()
    removeRefreshToken()
    localStorage.removeItem("user_tenants")
  }

  const refreshUser = async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) return
    try {
      const res = await fetch(`${API_CONFIG.BASE_API_URL}${API_CONFIG.ENDPOINTS.REFRESH_TOKEN}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      })
      const data = await res.json()
      if (res.ok && !data.hasError && data.data?.token) {
        const newToken = data.data.token
        const newRefresh = data.data.refreshToken
        setAuthToken(newToken)
        if (newRefresh) setRefreshToken(newRefresh)
        const decoded = jwtDecode<JwtPayload>(newToken)
        const storedTenants = localStorage.getItem("user_tenants")
        let parsedTenants = []
        try { parsedTenants = storedTenants ? JSON.parse(storedTenants) : [] } catch { }
        setUser({
          userId: decoded.userId,
          firstName: decoded.firstName,
          lastName: decoded.lastName,
          userName: decoded.userName,
          email: decoded.email,
          roles: decoded.roles?.split(",").map((role) => ({ id: "", name: role })) || [],
          twoFactorEnabled: decoded.twoFactorEnabled === "True",
          emailConfirmed: decoded.email_verified?.toLowerCase() === "true",
          token: newToken,
          refreshToken: newRefresh || refreshToken,
          tenants: tenantsOfCurrentDomain(parsedTenants),
        })
      }
    } catch { }
  }

  const switchTenant = async (tenantId: string) => {
    try {
      const { secureApiCall, API_CONFIG } = await import("@/lib/api")
      const establishmentType = getEstablishmentTypeByHostname(window.location.hostname)
      const result = await secureApiCall<AuthDto>(
        `${API_CONFIG.ENDPOINTS.SWITCH_TENANT}/${tenantId}?establishmentType=${establishmentType}`,
        { method: "POST" }
      )

      if (result.hasError) throw new Error(result.message ?? "Erro ao trocar de salão")

      if (result.data?.token) {
        login(result.data.token, result.data.refreshToken, result.data.tenants)
        // Recarregar a página para atualizar todos os contextos vinculados ao tenant
        window.location.reload()
      }
    } catch (err) {
      console.error("Erro ao trocar de salão:", err)
      throw err
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, switchTenant, refreshUser, loading }}>
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
