"use client"

import { useAuth } from "contexts/auth.context"
import { API_CONFIG, apiCall } from "lib/api"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { AuthDto } from "types/DTOs/auth.interface"
import { SignInDto } from "types/DTOs/sign-in.interface"
import { useState } from "react"
import { useRouter } from "expo-router"
import * as SecureStore from "expo-secure-store"

export const TWO_FACTOR_PENDING_KEY = "voro_2fa_pending_token"
export const TWO_FACTOR_EMAIL_KEY = "voro_2fa_email"

export function useSignIn() {
  const { login } = useAuth()
  const router = useRouter()
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

      if (!response.data) {
        const errorMessage = "Dados de usuário não encontrados na resposta"
        setError(errorMessage)
        return { success: false, error: errorMessage }
      }

      // Verificação em duas etapas: salva token temporário e redireciona
      if (response.data.requiresTwoFactor && response.data.twoFactorPendingToken) {
        await SecureStore.setItemAsync(TWO_FACTOR_PENDING_KEY, response.data.twoFactorPendingToken)
        await SecureStore.setItemAsync(TWO_FACTOR_EMAIL_KEY, data.email)
        router.push("/(auth)/verify-2fa")
        return { success: false, requiresTwoFactor: true }
      }

      if (response.data.token) {
        await login(response.data.token, response.data.refreshToken, response.data.tenants)
        reloadTheme()
        return { success: true }
      }

      const errorMessage = "Dados de usuário não encontrados na resposta"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } catch {
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
