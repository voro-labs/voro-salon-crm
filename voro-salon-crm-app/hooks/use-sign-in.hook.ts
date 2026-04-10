import { useAuth } from "contexts/auth.context"
import { API_CONFIG, apiCall } from "lib/api"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { AuthDto } from "types/DTOs/auth.interface"
import { SignInDto } from "types/DTOs/sign-in.interface"
import { useState } from "react"
import { useRouter } from "expo-router"
import * as SecureStore from "expo-secure-store"

export function useSignIn() {
  const { login } = useAuth()
  const router = useRouter()
  const { reload: reloadTheme } = useTenantTheme()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function _completeLogin(data: AuthDto) {
    const hasPostLoginSteps =
      data.requiresPasswordChange ||
      data.requiresTermsAcceptance ||
      data.requiresProfileCompletion

    if (hasPostLoginSteps) {
      await SecureStore.setItemAsync("post_login_flags", JSON.stringify({
        requiresPasswordChange: !!data.requiresPasswordChange,
        requiresTermsAcceptance: !!data.requiresTermsAcceptance,
        requiresProfileCompletion: !!data.requiresProfileCompletion,
      }))
    }

    await login(data.token!, data.refreshToken, data.tenants)
    reloadTheme()

    if (data.requiresPasswordChange) {
      router.replace("/(onboarding)/change-password")
    } else if (data.requiresTermsAcceptance) {
      router.replace("/(onboarding)/terms")
    } else if (data.requiresProfileCompletion) {
      router.replace("/(onboarding)/complete-profile")
    }
  }

  const signIn = async (data: SignInDto) => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiCall<AuthDto>(API_CONFIG.ENDPOINTS.SIGNIN, {
        method: "POST",
        body: JSON.stringify({ email: data.email, password: data.password }),
      })

      if (response.hasError) {
        setError(response.message ?? "Erro ao fazer login")
        return { success: false, error: response.message }
      }

      if (!response.data) {
        setError("Dados de usuário não encontrados na resposta")
        return { success: false }
      }

      // 2FA necessário: retorna o token pendente para o componente exibir inline
      if (response.data.requiresTwoFactor && response.data.twoFactorPendingToken) {
        return {
          success: false,
          requiresTwoFactor: true as const,
          pendingToken: response.data.twoFactorPendingToken,
          email: data.email,
        }
      }

      if (response.data.token) {
        await _completeLogin(response.data)
        return { success: true }
      }

      setError("Dados de usuário não encontrados na resposta")
      return { success: false }
    } catch {
      setError("Erro inesperado ao fazer login")
      return { success: false }
    } finally {
      setLoading(false)
    }
  }

  const verifyTwoFactor = async (pendingToken: string, code: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiCall<AuthDto>(API_CONFIG.ENDPOINTS.VERIFY_2FA, {
        method: "POST",
        body: JSON.stringify({ pendingToken, code }),
      })

      if (response.hasError || !response.data?.token) {
        setError(response.message ?? "Código inválido. Tente novamente.")
        return { success: false }
      }

      await _completeLogin(response.data)
      return { success: true }
    } catch {
      setError("Erro inesperado. Tente novamente.")
      return { success: false }
    } finally {
      setLoading(false)
    }
  }

  return {
    signIn,
    verifyTwoFactor,
    loading,
    error,
    clearError: () => setError(null),
  }
}
