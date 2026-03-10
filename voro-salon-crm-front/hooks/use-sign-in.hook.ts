"use client"

import { useAuth } from "@/contexts/auth.context"
import { API_CONFIG, apiCall, secureApiCall } from "@/lib/api"
import { refreshTenantTheme } from "@/contexts/tenant-theme.context"
import { AuthDto } from "@/types/DTOs/auth.interface"
import { SignInDto } from "@/types/DTOs/sign-in.interface"
import { useState } from "react"

export function useSignIn() {
  const { login } = useAuth()
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

      // Usar os helpers do ResponseViewModel
      if (response.hasError) {
        setError(response.message ?? "Erro ao fazer login")
        return { success: false, error: response.message ?? "Erro ao fazer login" }
      }

      if (response.data) {
        // Salvar token se fornecido pela API
        if (response.data?.token) {
          login(response.data?.token, response.data?.tenants)

          // Buscar e aplicar as cores do tenant imediatamente após o login
          // sem aguardar o reload — fire-and-forget
          secureApiCall<{ primaryColor: string | null; secondaryColor: string | null }>(
            API_CONFIG.ENDPOINTS.TENANT_ME,
            { method: "GET" }
          ).then((res) => {
            if (!res.hasError && res.data) {
              refreshTenantTheme(res.data.primaryColor, res.data.secondaryColor)
            }
          }).catch(() => { })
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
