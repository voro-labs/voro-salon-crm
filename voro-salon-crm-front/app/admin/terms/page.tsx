"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { secureApiCall, API_CONFIG } from "@/lib/api"
import { useAuth } from "@/contexts/auth.context"

export default function TermsPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleAccept() {
    if (!accepted) return
    setError(null)
    setLoading(true)

    try {
      const res = await secureApiCall<null>(`${API_CONFIG.ENDPOINTS.ACCEPT_TERMS}`, {
        method: "POST",
      })

      if (res.hasError) {
        setError(res.message ?? "Erro ao registrar aceitação dos termos.")
        return
      }

      setSuccess(true)

      const flagsRaw = sessionStorage.getItem("post_login_flags")
      const flags = flagsRaw ? JSON.parse(flagsRaw) : {}
      flags.requiresTermsAcceptance = false
      sessionStorage.setItem("post_login_flags", JSON.stringify(flags))

      const next = flags.requiresProfileCompletion ? "/admin/complete-profile" : "/"
      setTimeout(() => router.replace(next), 1000)
    } catch {
      setError("Erro inesperado. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-lg overflow-hidden">

        {/* Header */}
        <div className="flex flex-col items-center gap-3 p-8 pb-0">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <FileText className="h-7 w-7" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Termos de Uso</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {user ? `Olá, ${user.firstName}! ` : ""}
              Leia e aceite os termos para continuar.
            </p>
          </div>
        </div>

        {/* Termos */}
        <div className="mx-8 my-6 h-60 overflow-y-auto rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground leading-relaxed">
          <h2 className="font-semibold text-foreground mb-2">1. Aceitação dos Termos</h2>
          <p className="mb-3">
            Ao acessar e utilizar o Voro Salon CRM, você concorda com estes Termos de Uso e com nossa Política de Privacidade.
            Se você não concordar com qualquer parte destes termos, não deverá usar o sistema.
          </p>

          <h2 className="font-semibold text-foreground mb-2">2. Uso do Sistema</h2>
          <p className="mb-3">
            O sistema é disponibilizado para uso exclusivo da sua empresa e dos seus colaboradores autorizados.
            É proibido compartilhar credenciais de acesso com terceiros ou utilizá-las para fins não autorizados.
          </p>

          <h2 className="font-semibold text-foreground mb-2">3. Privacidade e Dados</h2>
          <p className="mb-3">
            Os dados de clientes e do salão armazenados no sistema são de responsabilidade do titular da conta.
            Tratamos todos os dados em conformidade com a Lei Geral de Proteção de Dados (LGPD).
          </p>

          <h2 className="font-semibold text-foreground mb-2">4. Responsabilidades</h2>
          <p className="mb-3">
            O titular é responsável por manter a confidencialidade das senhas e por todas as atividades realizadas
            sob sua conta. Qualquer uso indevido deve ser reportado imediatamente ao suporte.
          </p>

          <h2 className="font-semibold text-foreground mb-2">5. Alterações</h2>
          <p>
            Reservamo-nos o direito de atualizar estes termos periodicamente. Alterações relevantes serão
            comunicadas com antecedência. O uso continuado do sistema após as alterações implica aceitação dos novos termos.
          </p>
        </div>

        {/* Erro */}
        {error && (
          <div className="mx-8 mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Sucesso */}
        {success && (
          <div className="mx-8 mb-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-sm font-medium">Termos aceitos! Redirecionando...</p>
          </div>
        )}

        {/* Aceite */}
        <div className="px-8 pb-8 flex flex-col gap-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              disabled={loading || success}
              className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
            />
            <span className="text-sm text-muted-foreground">
              Li e concordo com os{" "}
              <span className="font-semibold text-foreground">Termos de Uso</span>{" "}
              e a{" "}
              <span className="font-semibold text-foreground">Política de Privacidade</span>.
            </span>
          </label>

          <Button
            onClick={handleAccept}
            disabled={!accepted || loading || success}
            className="w-full"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Registrando..." : success ? "Aceito!" : "Aceitar e continuar"}
          </Button>
        </div>
      </div>
    </div>
  )
}
