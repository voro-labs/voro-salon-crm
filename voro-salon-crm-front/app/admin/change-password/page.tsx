"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Eye, EyeOff, KeyRound, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { secureApiCall, API_CONFIG } from "@/lib/api"
import { useAuth } from "@/contexts/auth.context"

export default function ChangePasswordPage() {
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    const flagsRaw = sessionStorage.getItem("post_login_flags")
    if (!flagsRaw) { router.replace("/"); return }
    try {
      const flags = JSON.parse(flagsRaw)
      if (!flags.requiresPasswordChange) router.replace("/")
    } catch {
      router.replace("/")
    }
  }, [router])

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.")
      return
    }

    setLoading(true)
    try {
      const res = await secureApiCall<null>(`${API_CONFIG.ENDPOINTS.CHANGE_PASSWORD}`, {
        method: "POST",
        body: JSON.stringify({ newPassword }),
      })

      if (res.hasError) {
        setError(res.message ?? "Erro ao alterar senha.")
        return
      }

      setSuccess(true)

      // Avançar para o próximo passo do onboarding, se houver
      const flagsRaw = sessionStorage.getItem("post_login_flags")
      const flags = flagsRaw ? JSON.parse(flagsRaw) : {}
      flags.requiresPasswordChange = false
      sessionStorage.setItem("post_login_flags", JSON.stringify(flags))

      const next = flags.requiresTermsAcceptance
        ? "/admin/terms"
        : flags.requiresProfileCompletion
          ? "/admin/complete-profile"
          : "/"
      setTimeout(() => router.replace(next), 1500)
    } catch {
      setError("Erro inesperado. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-lg">

        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <KeyRound className="h-7 w-7" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Criar nova senha</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {user ? `Olá, ${user.firstName}! ` : ""}
              Defina uma senha segura para continuar.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-sm font-medium">Senha alterada! Redirecionando...</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-password">Nova senha</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                disabled={loading || success}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                disabled={loading || success}
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-password">Confirmar senha</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                autoComplete="new-password"
                disabled={loading || success}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                disabled={loading || success}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            A nova senha não pode ser igual às últimas senhas usadas.
          </p>

          <Button type="submit" disabled={loading || success} className="w-full mt-2">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Salvando..." : success ? "Salvo!" : "Salvar nova senha"}
          </Button>
        </form>
      </div>
    </div>
  )
}
