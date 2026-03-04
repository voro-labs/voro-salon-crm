"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle, AlertCircle, MailCheck, ArrowLeft, Loader2 } from "lucide-react"
import { API_CONFIG, apiCall } from "@/lib/api"
import { Button } from "@/components/ui/button"

export default function ConfirmEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const email = searchParams.get("email")

  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState<boolean | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!token || !email) {
      setError("Token ou e-mail inválido na URL.")
      setSuccess(false)
      setLoading(false)
      return
    }

    const confirmEmail = async () => {
      try {
        const response = await apiCall(API_CONFIG.ENDPOINTS.CONFIRM_EMAIL, {
          method: "POST",
          body: JSON.stringify({ token, email }),
        })
        if (response.status === 200) {
          setSuccess(true)
        } else {
          setSuccess(false)
          setError(response.message || "Erro ao confirmar o e-mail.")
        }
      } catch {
        setSuccess(false)
        setError("Erro de conexão. Tente novamente.")
      } finally {
        setLoading(false)
      }
    }

    confirmEmail()
  }, [token, email])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Confirmando e-mail...</p>
        </div>
      </div>
    )
  }

  if (success === false) {
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
