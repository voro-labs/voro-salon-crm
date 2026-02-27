"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { getAuthToken, removeAuthToken, setAuthToken } from "@/lib/api"
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
  login: (token: string) => void
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthDto | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = () => {
      const token = getAuthToken()

      if (!token) {
        setUser(null)
        setLoading(false)
        return
      }

      try {
        const decoded = jwtDecode<JwtPayload>(token)

        // Verificar expiração
        const now = Date.now() / 1000
        if (decoded.exp && decoded.exp < now) {
          removeAuthToken()
          setUser(null)
        } else {
          const userData: AuthDto = {
            userId: decoded.userId,
            firstName: decoded.firstName,
            lastName: decoded.lastName,
            userName: decoded.userName,
            email: decoded.email,
            roles: decoded.roles?.split(",").map(role => ({ id: "", name: role })) || [],
            expiration: new Date(decoded.exp * 1000),
            token: token
          }
          setUser(userData)
        }
      } catch (err) {
        console.error("Token inválido:", err)
        removeAuthToken()
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = (token: string) => {
    setAuthToken(token);

    try {
      const decoded = jwtDecode<JwtPayload>(token)
    

      const userData: AuthDto = {
        userId: decoded.userId,
        firstName: decoded.firstName,
        lastName: decoded.lastName,
        userName: decoded.userName,
        email: decoded.email,
        roles: decoded.roles?.split(",").map(role => ({ id: "", name: role })) || [],
        expiration: new Date(decoded.exp * 1000),
        token: token
      }

      setUser(userData)
    } catch (err) {
      console.error("Erro ao decodificar token:", err)
      removeAuthToken()
      setUser(null)
    }
  }

  const logout = () => {
    setUser(null)
    removeAuthToken()
    if (typeof window !== "undefined") {
      window.location.href = "/admin/sign-in"
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
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
