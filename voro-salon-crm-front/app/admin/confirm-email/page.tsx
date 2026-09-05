"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle, AlertCircle, MailCheck, ArrowLeft, Loader2, Smartphone, ExternalLink } from "lucide-react"
import { API_CONFIG, apiCall } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { LoadingSimple } from "@/components/ui/custom/loading/loading-simple"

type State = "detecting" | "mobile-choice" | "confirming" | "success" | "error"

function ConfirmEmailPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const email = searchParams.get("email")

  const [state, setState] = useState<State>("detecting")
  const [error, setError] = useState("")

  useEffect(() => {
    if (!token || !email) {
      setError("Token ou e-mail inválido na URL.")
      setState("error")
      return
    }

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (isMobile) {
      setState("mobile-choice")
    } else {
      confirmInWeb()
    }
  }, [])

  async function confirmInWeb() {
    setState("confirming")
    try {
      const response = await apiCall(API_CONFIG.ENDPOINTS.CONFIRM_EMAIL, {
        method: "POST",
        body: JSON.stringify({ token, email }),
      })
      if (response.status === 200) {
        setState("success")
      } else {
        setError(response.message || "Erro ao confirmar o e-mail.")
        setState("error")
      }
    } catch {
      setError("Erro de conexão. Tente novamente.")
      setState("error")
    }
  }

  function handleOpenApp() {
    const encodedEmail = encodeURIComponent(email ?? "")
    const encodedToken = encodeURIComponent(token ?? "")
    window.location.href = `vorosaloncrm://(auth)/confirm-email?email=${encodedEmail}&token=${encodedToken}`
  }

  // ── Loading / detecting ──────────────────────────────────────────────────────
  if (state === "detecting" || state === "confirming") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">{state === "confirming" ? "Confirmando e-mail..." : "Carregando..."}</p>
        </div>
      </div>
    )
  }

  // ── Mobile choice ────────────────────────────────────────────────────────────
  if (state === "mobile-choice") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MailCheck className="h-7 w-7" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-foreground">Confirmar E-mail</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Escolha como deseja confirmar seu endereço de e-mail.
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={handleOpenApp} className="w-full gap-2">
              <Smartphone className="h-4 w-4" />
              Abrir no App
            </Button>
            <Button variant="outline" onClick={confirmInWeb} className="w-full gap-2">
              <ExternalLink className="h-4 w-4" />
              Confirmar pelo navegador
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Se o app não abrir automaticamente, use a opção pelo navegador.
          </p>
        </div>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (state === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-foreground">Falha ao confirmar</h2>
          <p className="mb-6 text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={() => router.push("/admin/sign-in")} className="w-full gap-2">
            <ArrowLeft size={16} /> Voltar ao Login
          </Button>
        </div>
      </div>
    )
  }

  // ── Success ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 text-green-600">
          <CheckCircle className="h-7 w-7" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-foreground">E-mail confirmado!</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Seu endereço de e-mail foi verificado com sucesso. Agora você já pode fazer login.
        </p>
        <Button onClick={() => router.push("/admin/sign-in")} className="w-full gap-2">
          <MailCheck size={16} /> Ir para Login
        </Button>
      </div>
    </div>
  )
}

// useSearchParams() forca render no cliente; sem um limite de Suspense acima dele, a rota
// inteira deixa de poder ser pre-renderizada (issue #123, item 1).
export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={<LoadingSimple />}>
      <ConfirmEmailPageContent />
    </Suspense>
  )
}
