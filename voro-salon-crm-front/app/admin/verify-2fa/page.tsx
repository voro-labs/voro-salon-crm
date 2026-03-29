"use client"

import React, { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Loader2, Mail, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { apiCall, API_CONFIG, secureApiCall } from "@/lib/api"
import { AuthDto } from "@/types/DTOs/auth.interface"
import { EstablishmentType } from "@/types/Enums/establishmentType.enum"
import { getEstablishmentTypeByHostname, getBrandingByType } from "@/lib/branding"
import { useAuth } from "@/contexts/auth.context"
import { refreshTenantTheme } from "@/contexts/tenant-theme.context"
import { TWO_FACTOR_PENDING_KEY, TWO_FACTOR_EMAIL_KEY, TWO_FACTOR_REDIRECT_KEY, SIGN_IN_ERROR_KEY } from "@/hooks/use-sign-in.hook"

const CODE_LENGTH = 6

export default function VerifyTwoFactorPage() {
  const router = useRouter()
  const { login, logout } = useAuth()

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pendingToken, setPendingToken] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [redirectTo, setRedirectTo] = useState("/")

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    const token = sessionStorage.getItem(TWO_FACTOR_PENDING_KEY)
    const storedEmail = sessionStorage.getItem(TWO_FACTOR_EMAIL_KEY)
    const storedRedirect = sessionStorage.getItem(TWO_FACTOR_REDIRECT_KEY)

    if (!token) {
      router.replace("/admin/sign-in")
      return
    }

    setPendingToken(token)
    setEmail(storedEmail)
    if (storedRedirect) setRedirectTo(storedRedirect)
    inputRefs.current[0]?.focus()
  }, [router])

  const code = digits.join("")

  function handleChange(index: number, value: string) {
    // Aceita só dígito
    const digit = value.replace(/\D/g, "").slice(-1)
    setError(null)

    const next = [...digits]
    next[index] = digit
    setDigits(next)

    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const next = [...digits]
        next[index] = ""
        setDigits(next)
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus()
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH)
    if (!pasted) return

    const next = Array(CODE_LENGTH).fill("")
    pasted.split("").forEach((c, i) => { next[i] = c })
    setDigits(next)
    setError(null)

    const focusIndex = Math.min(pasted.length, CODE_LENGTH - 1)
    inputRefs.current[focusIndex]?.focus()
  }

  async function handleVerify() {
    if (code.length < CODE_LENGTH) {
      setError("Digite todos os 6 dígitos do código.")
      return
    }
    if (!pendingToken) return

    setLoading(true)
    setError(null)

    try {
      const response = await apiCall<AuthDto>(API_CONFIG.ENDPOINTS.VERIFY_2FA, {
        method: "POST",
        body: JSON.stringify({ pendingToken, code }),
      })

      if (response.hasError || !response.data?.token) {
        setError(response.message ?? "Código inválido. Tente novamente.")
        setDigits(Array(CODE_LENGTH).fill(""))
        inputRefs.current[0]?.focus()
        return
      }

      login(response.data.token, response.data.refreshToken, response.data.tenants)

      const tenantRes = await secureApiCall<{
        establishmentType: number
        primaryColor: string | null
        secondaryColor: string | null
      }>(API_CONFIG.ENDPOINTS.TENANT_ME, { method: "GET" })

      if (!tenantRes.hasError && tenantRes.data) {
        const expectedType = getEstablishmentTypeByHostname(window.location.hostname)
        const tenantType = tenantRes.data.establishmentType as EstablishmentType

        if (tenantType !== expectedType) {
          logout()
          const correctBranding = getBrandingByType(tenantType)
          const currentBranding = getBrandingByType(expectedType)
          const errorMsg = `Este acesso é exclusivo para ${currentBranding.establishmentLabelPlural}. Seu estabelecimento deve acessar pelo endereço: https://${correctBranding.hostname}`
          sessionStorage.removeItem(TWO_FACTOR_PENDING_KEY)
          sessionStorage.removeItem(TWO_FACTOR_EMAIL_KEY)
          sessionStorage.removeItem(TWO_FACTOR_REDIRECT_KEY)
          sessionStorage.setItem(SIGN_IN_ERROR_KEY, errorMsg)
          router.replace("/admin/sign-in")
          return
        }

        refreshTenantTheme(tenantRes.data.primaryColor, tenantRes.data.secondaryColor)
      }

      // Limpar dados temporários (somente após verificação bem-sucedida do tenant)
      sessionStorage.removeItem(TWO_FACTOR_PENDING_KEY)
      sessionStorage.removeItem(TWO_FACTOR_EMAIL_KEY)
      sessionStorage.removeItem(TWO_FACTOR_REDIRECT_KEY)

      setSuccess(true)

      // Armazenar flags pós-login para encadeamento entre páginas
      sessionStorage.setItem("post_login_flags", JSON.stringify({
        requiresPasswordChange: !!response.data.requiresPasswordChange,
        requiresTermsAcceptance: !!response.data.requiresTermsAcceptance,
        requiresProfileCompletion: !!response.data.requiresProfileCompletion,
      }))

      // Usar window.location para garantir navegação completa (evita race condition
      // entre setUser do AuthContext e router.replace do Next.js)
      const dest = response.data.requiresPasswordChange
        ? "/admin/change-password"
        : response.data.requiresTermsAcceptance
          ? "/admin/terms"
          : response.data.requiresProfileCompletion
            ? "/admin/complete-profile"
            : redirectTo
      window.location.replace(dest)
    } catch {
      setError("Erro inesperado. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  // Auto-submit quando todos os dígitos forem preenchidos
  useEffect(() => {
    if (code.length === CODE_LENGTH && !digits.includes("") && pendingToken) {
      handleVerify()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-lg">

        {/* Header */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Verificação</h1>
            <p className="mt-1 text-sm text-muted-foreground">Autenticação em duas etapas</p>
          </div>
        </div>

        {/* Info do e-mail */}
        {email && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Código enviado para{" "}
              <span className="font-semibold text-foreground">{email}</span>
            </p>
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="mb-5 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Sucesso */}
        {success && (
          <div className="mb-5 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-sm font-medium">Verificado! Redirecionando...</p>
          </div>
        )}

        {/* Inputs de dígitos */}
        <div className="mb-6 flex justify-center gap-2">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              disabled={loading || success}
              className={[
                "h-12 w-11 rounded-xl border bg-background text-center text-xl font-bold tabular-nums",
                "transition-colors outline-none",
                "focus:border-primary focus:ring-2 focus:ring-primary/20",
                error ? "border-destructive" : "border-border",
                (loading || success) ? "opacity-50 cursor-not-allowed" : "",
              ].join(" ")}
            />
          ))}
        </div>

        {/* Botão verificar */}
        <Button
          onClick={handleVerify}
          disabled={loading || success || code.length < CODE_LENGTH}
          className="w-full"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? "Verificando..." : success ? "Verificado!" : "Verificar Código"}
        </Button>

        {/* Rodapé */}
        <div className="mt-5 flex flex-col items-center gap-3">
          <p className="text-xs text-muted-foreground text-center">
            O código expira em <span className="font-semibold">10 minutos</span>.<br />
            Verifique também a pasta de spam.
          </p>
          <button
            type="button"
            onClick={() => router.replace("/admin/sign-in")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            disabled={loading}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao login
          </button>
        </div>
      </div>
    </div>
  )
}
