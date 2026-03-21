"use client"

import { useAuth } from "@/contexts/auth.context"
import { API_CONFIG, apiCall, secureApiCall } from "@/lib/api"
import { refreshTenantTheme } from "@/contexts/tenant-theme.context"
import { AuthDto } from "@/types/DTOs/auth.interface"
import { SignInDto } from "@/types/DTOs/sign-in.interface"
import { useState } from "react"
import { useRouter } from "next/navigation"

export const TWO_FACTOR_PENDING_KEY = "voro_2fa_pending_token"
export const TWO_FACTOR_EMAIL_KEY = "voro_2fa_email"
export const TWO_FACTOR_REDIRECT_KEY = "voro_2fa_redirect"

export function useSignIn() {
  const { login } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signIn = async (data: SignInDto, redirectTo = "/") => {
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

      // Verificação em duas etapas: redireciona para a tela de código
      if (response.data.requiresTwoFactor && response.data.twoFactorPendingToken) {
        sessionStorage.setItem(TWO_FACTOR_PENDING_KEY, response.data.twoFactorPendingToken)
        sessionStorage.setItem(TWO_FACTOR_EMAIL_KEY, data.email)
        sessionStorage.setItem(TWO_FACTOR_REDIRECT_KEY, redirectTo)
        router.push("/admin/verify-2fa")
        return { success: false, requiresTwoFactor: true }
      }

      // Login direto (caso 2FA seja desativado no futuro)
      if (response.data.token) {
        login(response.data.token, response.data.refreshToken, response.data.tenants)

        secureApiCall<{ primaryColor: string | null; secondaryColor: string | null }>(
          API_CONFIG.ENDPOINTS.TENANT_ME,
          { method: "GET" }
        ).then((res) => {
          if (!res.hasError && res.data) {
            refreshTenantTheme(res.data.primaryColor, res.data.secondaryColor)
          }
        }).catch(() => { })

        sessionStorage.setItem("post_login_flags", JSON.stringify({
          requiresPasswordChange: !!response.data.requiresPasswordChange,
          requiresTermsAcceptance: !!response.data.requiresTermsAcceptance,
          requiresProfileCompletion: !!response.data.requiresProfileCompletion,
        }))

        const dest = response.data.requiresPasswordChange
          ? "/admin/change-password"
          : response.data.requiresTermsAcceptance
            ? "/admin/terms"
            : response.data.requiresProfileCompletion
              ? "/admin/complete-profile"
              : redirectTo
        window.location.replace(dest)
      }

      return { success: true }
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
