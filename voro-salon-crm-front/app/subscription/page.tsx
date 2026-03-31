"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import {
  CheckCircle2, Clock, CreditCard, Loader2, ArrowRight, AlertCircle, Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { API_CONFIG, apiCall, secureApiCall } from "@/lib/api"
import { fetcher } from "@/lib/fetcher"
import { useSubscription } from "@/hooks/use-subscription.hook"
import { useAuth } from "@/contexts/auth.context"
import type { SubscriptionPlanDto, CheckoutResultDto } from "@/types/subscription.interface"
import { ModuleInfoDialog } from "@/components/ui/custom/module-info-dialog"

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
  const [openModuleKey, setOpenModuleKey] = useState<string | null>(null)

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
  const canResubscribe = subscription && !isActive && !isTrial
  const currentPlanInList = plans?.some((p) => p.id === subscription?.plan?.id)

  // Exibe apenas planos com preço maior que o plano atual (evolução sem downgrade)
  const currentPrice = subscription?.plan?.monthlyPrice ?? 0
  const visiblePlans = (isActive || isTrial)
    ? plans?.filter((p) => p.monthlyPrice > currentPrice)
    : plans

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

            <div className="pt-4 border-t border-border flex flex-col gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">Limites do plano atual</span>
              <div className="flex items-center gap-8">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Clientes</span>
                  <span className="text-sm font-bold text-foreground">
                    {subscription.plan?.maxClients === -1 || !subscription.plan ? "Ilimitado" : subscription.plan.maxClients}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Funcionários</span>
                  <span className="text-sm font-bold text-foreground">
                    {subscription.plan?.maxEmployees === -1 || !subscription.plan ? "Ilimitado" : subscription.plan.maxEmployees}
                  </span>
                </div>
              </div>
            </div>

            {canResubscribe && subscription.plan && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectPlan(subscription.plan as SubscriptionPlanDto)}
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Reassinar este plano
                </Button>
              </div>
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
          {isActive ? "Trocar plano" : canResubscribe && currentPlanInList ? "Reassinar ou trocar plano" : "Escolher plano"}
        </h2>

        {!visiblePlans ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : visiblePlans.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground text-sm">
            Você já está no plano mais completo disponível.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {visiblePlans.map((plan) => {
              const isCurrent = plan.id === subscription?.plan?.id
              // Plano atual só fica bloqueado se a assinatura estiver ativa
              const isDisabled = isCurrent && isActive
              return (
                <button
                  key={plan.id}
                  onClick={() => !isDisabled && handleSelectPlan(plan)}
                  disabled={isDisabled}
                  className={`text-left rounded-xl border p-4 transition-all ${
                    isDisabled
                      ? "border-primary bg-primary/5 cursor-default"
                      : "border-border hover:border-primary/60 hover:bg-accent/50 cursor-pointer"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm">{plan.name}</span>
                    {isCurrent && isActive && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                  </div>
                  <p className="text-xl font-black mb-1">
                    {plan.monthlyPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    <span className="text-xs font-normal text-muted-foreground">/mês</span>
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{plan.description}</p>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {plan.hasEmployees
                      ? <div>{plan.maxEmployees === -1 ? "Funcionários ilimitados" : `Até ${plan.maxEmployees} funcionários`}</div>
                      : <div>Apenas o proprietário</div>
                    }
                    <div>{plan.maxClients === -1 ? "Clientes ilimitados" : `Até ${plan.maxClients} clientes`}</div>
                    {plan.hasFinancial && (
                      <div role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setOpenModuleKey("financial") }} onKeyDown={(e) => e.key === "Enter" && setOpenModuleKey("financial")} className="flex items-center gap-1 hover:text-primary transition-colors w-full text-left cursor-pointer">
                        <CheckCircle2 className="h-3 w-3 text-primary" /> Finanças <Info className="h-3 w-3 ml-auto opacity-60" />
                      </div>
                    )}
                    {plan.hasAnamnesis && (
                      <div role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setOpenModuleKey("anamnesis") }} onKeyDown={(e) => e.key === "Enter" && setOpenModuleKey("anamnesis")} className="flex items-center gap-1 hover:text-primary transition-colors w-full text-left cursor-pointer">
                        <CheckCircle2 className="h-3 w-3 text-primary" /> Anamnese <Info className="h-3 w-3 ml-auto opacity-60" />
                      </div>
                    )}
                    {plan.hasBooking && (
                      <div role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setOpenModuleKey("booking") }} onKeyDown={(e) => e.key === "Enter" && setOpenModuleKey("booking")} className="flex items-center gap-1 hover:text-primary transition-colors w-full text-left cursor-pointer">
                        <CheckCircle2 className="h-3 w-3 text-primary" /> Agendamento Online <Info className="h-3 w-3 ml-auto opacity-60" />
                      </div>
                    )}
                    {plan.hasWhatsAppBot && (
                      <div role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setOpenModuleKey("whatsappBot") }} onKeyDown={(e) => e.key === "Enter" && setOpenModuleKey("whatsappBot")} className="flex items-center gap-1 hover:text-primary transition-colors w-full text-left cursor-pointer">
                        <CheckCircle2 className="h-3 w-3 text-primary" /> Bot WhatsApp <Info className="h-3 w-3 ml-auto opacity-60" />
                      </div>
                    )}
                  </div>
                  {!isDisabled && (
                    <div className="mt-3 text-xs font-semibold text-primary flex items-center gap-1">
                      {isCurrent && canResubscribe ? "Reassinar" : isActive ? "Fazer upgrade" : "Assinar"} <ArrowRight className="h-3 w-3" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Module info dialog */}
      <ModuleInfoDialog moduleKey={openModuleKey} onClose={() => setOpenModuleKey(null)} />

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
