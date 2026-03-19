"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, Scissors, Loader2, XCircle, SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { API_CONFIG, apiCall } from "@/lib/api"

type Status = "loading" | "success" | "error" | "not_found"

export default function PagarSucessoPage() {
  const searchParams = useSearchParams()
  const preapprovalId = searchParams.get("preapproval_id")
  const [status, setStatus] = useState<Status>(preapprovalId ? "loading" : "not_found")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!preapprovalId) return

    apiCall<null>(`${API_CONFIG.ENDPOINTS.SUBSCRIPTION_CONFIRM}/${preapprovalId}`, {
      method: "POST",
    }).then((res) => {
      if (res.hasError) {
        setErrorMsg(res.message ?? "Erro ao confirmar assinatura.")
        setStatus("error")
      } else {
        setStatus("success")
      }
    })
  }, [preapprovalId])

  if (status === "not_found") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="h-20 w-20 rounded-3xl bg-muted flex items-center justify-center mx-auto mb-6">
            <SearchX className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-black tracking-tight mb-3">Assinatura não encontrada</h1>
          <p className="text-muted-foreground text-sm mb-8">
            Não identificamos uma assinatura associada a este link. Se você acabou de assinar, aguarde alguns instantes e recarregue a página, ou entre em contato conosco:{" "}
            <a href="mailto:contato@vorolabs.app" className="text-primary hover:underline">
              contato@vorolabs.app
            </a>
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link href="/prices">Ver planos</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/sign-in">Já tenho conta</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
          </div>
          <h1 className="text-2xl font-black tracking-tight mb-3">Confirmando sua assinatura...</h1>
          <p className="text-muted-foreground text-sm">Aguarde um instante enquanto ativamos sua conta.</p>
        </div>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="h-20 w-20 rounded-3xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <XCircle className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-black tracking-tight mb-3">Algo deu errado</h1>
          <p className="text-muted-foreground text-sm mb-2">
            Não conseguimos confirmar sua assinatura automaticamente.
          </p>
          {errorMsg && (
            <p className="text-xs text-destructive/80 bg-destructive/5 rounded-lg px-4 py-2 mb-6 font-mono break-all">
              {errorMsg}
            </p>
          )}
          <p className="text-muted-foreground text-sm mb-8">
            Não se preocupe — se o pagamento foi aprovado, nossa equipe ativará sua conta em até 24 horas. Entre em
            contato se precisar de ajuda:{" "}
            <a href="mailto:contato@vorolabs.app" className="text-primary hover:underline">
              contato@vorolabs.app
            </a>
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" asChild>
              <Link href="/prices">Voltar aos planos</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="h-20 w-20 rounded-3xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-black tracking-tight mb-3">Assinatura confirmada!</h1>
        <p className="text-muted-foreground text-base mb-2">
          Obrigado por assinar o <strong>Voro Salon CRM</strong>.
        </p>
        <p className="text-muted-foreground text-sm mb-8">
          Você receberá um e-mail com suas credenciais de acesso em breve.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href="/admin/sign-in">Acessar minha conta</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/prices">Voltar aos planos</Link>
          </Button>
        </div>
        <div className="flex items-center justify-center gap-2 mt-10 text-xs text-muted-foreground">
          <div className="h-5 w-5 rounded bg-primary flex items-center justify-center">
            <Scissors className="h-3 w-3 text-primary-foreground" />
          </div>
          Voro Salon CRM © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}
