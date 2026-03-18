"use client"

import { useAuth } from "contexts/auth.context"
import { API_CONFIG, apiCall } from "lib/api"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { AuthDto } from "types/DTOs/auth.interface"
import { SignInDto } from "types/DTOs/sign-in.interface"
import { useState } from "react"

export function useSignIn() {
  const { login } = useAuth()
  const { reload: reloadTheme } = useTenantTheme()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signIn = async (data: SignInDto) => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiCall<AuthDto>(API_CONFIG.ENDPOINTS.SIGNIN, {
        method: "POST",
        body: JSON.stringify({
          email: data.email,
          password: data.password
        }),
      })

      if (response.hasError) {
        setError(response.message ?? "Erro ao fazer login")
        return { success: false, error: response.message ?? "Erro ao fazer login" }
      }

      if (response.data) {
        if (response.data?.token) {
          await login(response.data.token, response.data.refreshToken, response.data.tenants)
          // Atualiza o tema do tenant no contexto imediatamente após o login
          reloadTheme()
        }
        return { success: true }
      } else {
        const errorMessage = "Dados de usuário não encontrados na resposta"
        setError(errorMessage)
        return { success: false, error: errorMessage }
      }
    } catch (err) {
      const errorMessage = "Erro inesperado ao fazer login"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  return {
    signIn,
    loading,
    error,
    clearError: () => setError(null),
  }
}
