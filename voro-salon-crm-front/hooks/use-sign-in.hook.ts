"use client"

import { useAuth } from "@/contexts/auth.context"
import { API_CONFIG, apiCall, secureApiCall } from "@/lib/api"
import { refreshTenantTheme } from "@/contexts/tenant-theme.context"
import { AuthDto } from "@/types/DTOs/auth.interface"
import { SignInDto } from "@/types/DTOs/sign-in.interface"
import { EstablishmentType } from "@/types/Enums/establishmentType.enum"
import { getEstablishmentTypeByHostname, getBrandingByType } from "@/lib/branding"
import { useState } from "react"
import { useRouter } from "next/navigation"

export const TWO_FACTOR_PENDING_KEY = "voro_2fa_pending_token"
export const TWO_FACTOR_EMAIL_KEY = "voro_2fa_email"
export const TWO_FACTOR_REDIRECT_KEY = "voro_2fa_redirect"
export const SIGN_IN_ERROR_KEY = "voro_signin_error"

export function useSignIn() {
  const { login, logout } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signIn = async (data: SignInDto, redirectTo = "/") => {
    setLoading(true)
    setError(null)
    let didRedirect = false
    
    try {
      const expectedType = getEstablishmentTypeByHostname(window.location.hostname)

      const response = await apiCall<AuthDto>(API_CONFIG.ENDPOINTS.SIGNIN, {
        method: "POST",
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          establishmentType: expectedType,
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

        const tenantRes = await secureApiCall<{
          establishmentType: number
          primaryColor: string | null
          secondaryColor: string | null
          defaultPage: string | null
        }>(API_CONFIG.ENDPOINTS.TENANT_ME, { method: "GET" })

        if (!tenantRes.hasError && tenantRes.data) {
          const expectedType = getEstablishmentTypeByHostname(window.location.hostname)
          const tenantType = tenantRes.data.establishmentType as EstablishmentType

          if (tenantType !== expectedType) {
            logout()
            const correctBranding = getBrandingByType(tenantType)
            const currentBranding = getBrandingByType(expectedType)
            const errorMessage = `Este acesso é exclusivo para ${currentBranding.establishmentLabelPlural}. Seu estabelecimento deve acessar pelo endereço: https://${correctBranding.hostname}`
            setError(errorMessage)
            return { success: false, error: errorMessage }
          }

          refreshTenantTheme(tenantRes.data.primaryColor, tenantRes.data.secondaryColor)
        }

        sessionStorage.setItem("post_login_flags", JSON.stringify({
          requiresPasswordChange: !!response.data.requiresPasswordChange,
          requiresTermsAcceptance: !!response.data.requiresTermsAcceptance,
          requiresProfileCompletion: !!response.data.requiresProfileCompletion,
          defaultPage: tenantRes.data?.defaultPage || "/",
        }))

        const defaultPage = redirectTo === "/" ? (tenantRes.data?.defaultPage || "/") : redirectTo
        const dest = response.data.requiresPasswordChange
          ? "/admin/change-password"
          : response.data.requiresTermsAcceptance
            ? "/admin/terms"
            : response.data.requiresProfileCompletion
              ? "/admin/complete-profile"
              : defaultPage
        window.location.replace(dest)
        didRedirect = true
        return { success: true }
      }

      return { success: true }
    } catch {
      const errorMessage = "Erro inesperado ao fazer login"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      if (!didRedirect) {
        setLoading(false)
      }
    }
  }

  return {
    signIn,
    loading,
    error,
    clearError: () => setError(null),
  }
}
