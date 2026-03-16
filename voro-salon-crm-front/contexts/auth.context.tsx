"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { getAuthToken, removeAuthToken, setAuthToken, getRefreshToken, setRefreshToken, removeRefreshToken } from "@/lib/api"
import { AuthDto } from "@/types/DTOs/auth.interface"
import { jwtDecode } from "jwt-decode"


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
  login: (token: string, refreshToken?: string, tenants?: any[]) => void
  logout: () => void
  switchTenant: (tenantId: string) => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthDto | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = () => {
      const token = getAuthToken()
      const storedTenants = localStorage.getItem("user_tenants")

      if (!token) {
        setUser(null)
        setLoading(false)
        return
      }

      try {
        const decoded = jwtDecode<JwtPayload>(token)

        // Nota: O checkAuth não irá mais remover o token se expirar.
        // Iremos carregar o User na memória de qualquer maneira, e delegar 
        // a responsabilidade do fluxo de 401 e recarga (refresh) ao apiCall 
        // intercepetor. Só remove se não tiver payload para ler.
        
        const refreshToken = getRefreshToken() || undefined

        const userData: AuthDto = {
          userId: decoded.userId,
          firstName: decoded.firstName,
          lastName: decoded.lastName,
          userName: decoded.userName,
          email: decoded.email,
          roles: decoded.roles?.split(",").map(role => ({ id: "", name: role })) || [],
          token: token,
          refreshToken: refreshToken,
          tenants: storedTenants ? JSON.parse(storedTenants) : []
        }
        setUser(userData)
      } catch (err) {
        console.error("Token inválido:", err)
        removeAuthToken()
        removeRefreshToken()
        setUser(null)
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
        token: token,
        refreshToken: refreshToken,
        tenants: tenants || []
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

  const switchTenant = async (tenantId: string) => {
    try {
      const { secureApiCall, API_CONFIG } = await import("@/lib/api")
      const result = await secureApiCall<AuthDto>(`${API_CONFIG.ENDPOINTS.SWITCH_TENANT}/${tenantId}`, {
        method: "POST"
      })

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
    <AuthContext.Provider value={{ user, login, logout, switchTenant, loading }}>
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
