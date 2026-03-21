"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import {
  CheckCircle2, Clock, CreditCard, Loader2, Zap, ArrowRight, AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { API_CONFIG, apiCall, secureApiCall } from "@/lib/api"
import { fetcher } from "@/lib/fetcher"
import { useSubscription } from "@/hooks/use-subscription.hook"
import { useAuth } from "@/contexts/auth.context"
import type { SubscriptionPlanDto, CheckoutResultDto } from "@/types/subscription.interface"

function statusLabel(status: string) {
  switch (status) {
    case "Trial": return { text: "Trial", class: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" }
    case "Active": return { text: "Ativo", class: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" }
    case "Inactive": return { text: "Inativo", class: "bg-muted text-muted-foreground" }
    case "Cancelled": return { text: "Cancelado", class: "bg-destructive/10 text-destructive" }
    case "PastDue": return { text: "Pagamento pendente", class: "bg-orange-100 text-orange-700" }
    default: return { text: status, class: "bg-muted text-muted-foreground" }
  }
}

export default function SubscriptionPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { subscription, isLoading, isTrial, isActive, trialDaysLeft, trialEndsAt, mutate } = useSubscription()

  const { data: tenant } = useSWR(
    user?.token ? API_CONFIG.ENDPOINTS.TENANT_ME : null,
    async (url) => {
      const res = await secureApiCall<any>(url, { method: "GET" })
      return res.hasError ? null : res.data
    }
  )

  const { data: plans } = useSWR<SubscriptionPlanDto[]>(
    API_CONFIG.ENDPOINTS.SUBSCRIPTION_PLANS,
    fetcher
  )

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanDto | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Guard de autenticação
  useEffect(() => {
    if (!loading && !user?.token) {
      router.replace("/admin/sign-in?redirect=/subscription")
    }
  }, [loading, user, router])

  const handleSelectPlan = (plan: SubscriptionPlanDto) => {
    setSelectedPlan(plan)
    setError(null)
  }

  const handleConfirmPlan = async () => {
    if (!selectedPlan || !tenant?.id) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await apiCall<CheckoutResultDto>(API_CONFIG.ENDPOINTS.SUBSCRIPTION_CHECKOUT, {
        method: "POST",
        body: JSON.stringify({
          planId: selectedPlan.id,
          tenantId: tenant.id,
          email: user?.email ?? "",
          name: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim(),
          salonName: tenant.name ?? "",
        }),
      })
      if (res.hasError || !res.data) {
        setError(res.message ?? "Erro ao iniciar checkout.")
        return
      }
      if (res.data.checkoutUrl) {
        window.location.href = res.data.checkoutUrl
      } else {
        await mutate()
        setSelectedPlan(null)
      }
    } catch {
      setError("Erro inesperado. Tente novamente.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user?.token) return null

  const status = subscription ? statusLabel(subscription.status) : null

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Assinatura</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie seu plano e assinatura.</p>
      </div>

      {/* Plano atual */}
      {subscription ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <span className="font-bold text-lg">{subscription.plan?.name ?? "Plano atual"}</span>
              </div>
              {status && (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.class}`}>
                  {status.text}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-2xl font-black">
              {subscription.plan?.monthlyPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              <span className="text-sm font-normal text-muted-foreground">/mês</span>
            </p>

            {isTrial && trialEndsAt && (
              <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
                trialDaysLeft <= 2
                  ? "bg-destructive/10 text-destructive"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
              }`}>
                <Clock className="h-4 w-4 shrink-0" />
                {trialDaysLeft > 0
                  ? <span><strong>{trialDaysLeft} dia{trialDaysLeft !== 1 ? "s" : ""}</strong> restantes no trial — encerra em {trialEndsAt.toLocaleDateString("pt-BR")}</span>
                  : <span>Trial encerrado</span>
                }
              </div>
            )}

            {isActive && subscription.nextPaymentAt && (
              <p className="text-sm text-muted-foreground">
                Próxima cobrança em{" "}
                <span className="font-medium text-foreground">
                  {new Date(subscription.nextPaymentAt).toLocaleDateString("pt-BR")}
                </span>
              </p>
            )}

            {isActive && subscription.lastPaymentAt && (
              <p className="text-sm text-muted-foreground">
                Último pagamento:{" "}
                <span className="font-medium text-foreground">
                  {new Date(subscription.lastPaymentAt).toLocaleDateString("pt-BR")}
                </span>
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Nenhuma assinatura encontrada.</p>
          </CardContent>
        </Card>
      )}

      {/* Seleção de plano */}
      <div>
        <h2 className="text-lg font-bold mb-4">
          {isActive ? "Trocar plano" : "Escolher plano"}
        </h2>

        {!plans ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const isCurrent = plan.id === subscription?.plan?.id
              return (
                <button
                  key={plan.id}
                  onClick={() => !isCurrent && handleSelectPlan(plan)}
                  disabled={isCurrent}
                  className={`text-left rounded-xl border p-4 transition-all ${
                    isCurrent
                      ? "border-primary bg-primary/5 cursor-default"
                      : "border-border hover:border-primary/60 hover:bg-accent/50 cursor-pointer"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm">{plan.name}</span>
                    {isCurrent && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                  </div>
                  <p className="text-xl font-black mb-1">
                    {plan.monthlyPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    <span className="text-xs font-normal text-muted-foreground">/mês</span>
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{plan.description}</p>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <div>{plan.maxEmployees === -1 ? "Funcionários ilimitados" : `Até ${plan.maxEmployees} funcionários`}</div>
                    <div>{plan.maxClients === -1 ? "Clientes ilimitados" : `Até ${plan.maxClients} clientes`}</div>
                    {plan.hasFinancial && <div className="flex items-center gap-1"><Zap className="h-3 w-3" /> Financeiro</div>}
                    {plan.hasAnamnesis && <div className="flex items-center gap-1"><Zap className="h-3 w-3" /> Anamnese</div>}
                  </div>
                  {!isCurrent && (
                    <div className="mt-3 text-xs font-semibold text-primary flex items-center gap-1">
                      {isActive ? "Fazer upgrade" : "Assinar"} <ArrowRight className="h-3 w-3" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Dialog de confirmação */}
      <Dialog open={!!selectedPlan} onOpenChange={(o) => { if (!o) { setSelectedPlan(null); setError(null) } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar assinatura</DialogTitle>
            <DialogDescription>
              Você será redirecionado ao MercadoPago para completar a assinatura.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="font-bold">{selectedPlan?.name}</p>
              <p className="text-2xl font-black mt-1">
                {selectedPlan?.monthlyPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                <span className="text-sm font-normal text-muted-foreground">/mês</span>
              </p>
            </div>
            {error && <p className="text-sm text-destructive font-medium">{error}</p>}
            <Button onClick={handleConfirmPlan} disabled={submitting} className="w-full">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ir para pagamento
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
