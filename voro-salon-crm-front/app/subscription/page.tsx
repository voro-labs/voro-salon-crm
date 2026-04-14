"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import Image from "next/image"
import {
  CheckCircle2, Clock, CreditCard, Loader2, ArrowRight, AlertCircle, Info,
  QrCode, Copy, Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { API_CONFIG, apiCall, secureApiCall } from "@/lib/api"
import { fetcher } from "@/lib/fetcher"
import { useSubscription } from "@/hooks/use-subscription.hook"
import { useAuth } from "@/contexts/auth.context"
import type { SubscriptionPlanDto, CheckoutResultDto, ResolvedPlanPriceDto } from "@/types/subscription.interface"
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
  const [paymentMethod, setPaymentMethod] = useState<"CreditCard" | "Pix">("CreditCard")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openModuleKey, setOpenModuleKey] = useState<string | null>(null)
  const [pixData, setPixData] = useState<{ subscriptionId: string; qrCode: string; qrCodeBase64: string; expiresAt: string } | null>(null)
  const [pixStatus, setPixStatus] = useState<"pending" | "approved" | "failed">("pending")
  const [copied, setCopied] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // checkoutCompleted tracks whether the checkout flow finished so we know
  // whether to call DELETE /subscription/pending-change on dialog close
  const checkoutCompletedRef = useRef(false)

  // Resolved prices — user-specific pricing taking into account promo eligibility
  const { data: resolvedPrices } = useSWR<ResolvedPlanPriceDto[]>(
    user?.token ? API_CONFIG.ENDPOINTS.SUBSCRIPTION_RESOLVED_PRICES : null,
    async (url: string) => {
      const res = await secureApiCall<ResolvedPlanPriceDto[]>(url, { method: "GET" })
      return res.hasError || !res.data ? [] : res.data
    }
  )

  // Helpers for resolved price lookup
  function getResolvedPrice(plan: SubscriptionPlanDto): number {
    const found = resolvedPrices?.find((r) => r.planId === plan.id)
    return found ? found.displayPrice : effectivePlanPrice(plan)
  }

  function isResolvedPromoActive(plan: SubscriptionPlanDto): boolean {
    const display = getResolvedPrice(plan)
    return display < plan.monthlyPrice
  }

  // Guard de autenticação
  useEffect(() => {
    if (!loading && !user?.token) {
      router.replace("/admin/sign-in?redirect=/subscription")
    }
  }, [loading, user, router])

  const handleSelectPlan = (plan: SubscriptionPlanDto) => {
    setSelectedPlan(plan)
    setPaymentMethod("CreditCard")
    setError(null)
  }

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  const startPixPolling = (subscriptionId: string) => {
    stopPolling()
    pollingRef.current = setInterval(async () => {
      try {
        const res = await apiCall<{ status: string }>(
          `${API_CONFIG.ENDPOINTS.SUBSCRIPTION_PIX_STATUS}/${subscriptionId}`,
          { method: "GET" }
        )
        if (!res.hasError && res.data?.status) {
          const s = res.data.status.toLowerCase()
          if (s === "active") {
            setPixStatus("approved")
            stopPolling()
            setTimeout(async () => {
              await mutate()
              setPixData(null)
              setSelectedPlan(null)
            }, 2000)
          } else if (s === "cancelled") {
            setPixStatus("failed")
            stopPolling()
          }
        }
      } catch {
        // ignore polling errors
      }
    }, 3000)
  }

  useEffect(() => stopPolling, [])

  const handleConfirmPlan = async () => {
    if (!selectedPlan || !tenant?.id) return
    setSubmitting(true)
    setError(null)
    try {
      const checkoutDto = {
        planId: selectedPlan.id,
        tenantId: tenant.id,
        email: user?.email ?? "",
        name: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim(),
        salonName: tenant.name ?? "",
        checkoutMethod: paymentMethod,
      }

      // Use change-plan endpoint when user already has an active (or trial) subscription
      const endpoint = (isActive || isTrial)
        ? API_CONFIG.ENDPOINTS.SUBSCRIPTION_CHANGE_PLAN
        : API_CONFIG.ENDPOINTS.SUBSCRIPTION_CHECKOUT

      const res = await secureApiCall<CheckoutResultDto>(endpoint, {
        method: "POST",
        body: JSON.stringify(checkoutDto),
      })
      if (res.hasError || !res.data) {
        setError(res.message ?? "Erro ao iniciar checkout.")
        return
      }
      if (res.data.checkoutUrl) {
        // Mark as completed so we don't call DELETE pending-change (redirect handles it)
        checkoutCompletedRef.current = true
        window.location.href = res.data.checkoutUrl
      } else if (res.data.pixQrCode) {
        setPixData({
          subscriptionId: res.data.subscriptionId,
          qrCode: res.data.pixQrCode,
          qrCodeBase64: res.data.pixQrCodeBase64 ?? "",
          expiresAt: res.data.pixExpiresAt ?? "",
        })
        setPixStatus("pending")
        // Keep selectedPlan null to close the confirm dialog and show the Pix dialog
        checkoutCompletedRef.current = true
        setSelectedPlan(null)
        startPixPolling(res.data.subscriptionId)
      } else {
        checkoutCompletedRef.current = true
        await mutate()
        setSelectedPlan(null)
      }
    } catch {
      setError("Erro inesperado. Tente novamente.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleCheckoutDialogClose = async () => {
    if (!checkoutCompletedRef.current && (isActive || isTrial)) {
      // User dismissed the dialog without completing — cancel the pending change
      await secureApiCall<unknown>(API_CONFIG.ENDPOINTS.SUBSCRIPTION_PENDING_CANCEL, { method: "DELETE" })
    }
    checkoutCompletedRef.current = false
    setSelectedPlan(null)
    setError(null)
  }

  const handleCopyPix = async () => {
    if (!pixData) return
    await navigator.clipboard.writeText(pixData.qrCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

  // Helpers de promoção
  function isPlanPromoActive(plan: SubscriptionPlanDto): boolean {
    if (!plan.promoPrice) return false
    if (!plan.promoEndsAt) return true
    return new Date(plan.promoEndsAt) > new Date()
  }

  function effectivePlanPrice(plan: SubscriptionPlanDto): number {
    return isPlanPromoActive(plan) ? plan.promoPrice! : plan.monthlyPrice
  }

  // Exibe apenas planos com preço maior que o plano atual (evolução sem downgrade)
  const currentPrice = subscription?.plan?.monthlyPrice ?? 0
  const visiblePlans = (isActive || isTrial)
    ? plans?.filter((p) => p.monthlyPrice > currentPrice)
    : plans

  // Label for action button
  const actionLabel = (plan: SubscriptionPlanDto) => {
    const isCurrent = plan.id === subscription?.plan?.id
    if (isCurrent && canResubscribe) return "Reassinar"
    if (isActive || isTrial) return "Fazer upgrade"
    return "Assinar"
  }

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
            <div>
              {subscription.lockedPromoPrice ? (
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-black">
                    {subscription.lockedPromoPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    <span className="text-sm font-normal text-muted-foreground">/mês</span>
                  </p>
                  <span className="text-sm text-muted-foreground line-through">
                    {subscription.plan?.monthlyPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>
              ) : (
                <p className="text-2xl font-black">
                  {subscription.plan?.monthlyPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  <span className="text-sm font-normal text-muted-foreground">/mês</span>
                </p>
              )}
              {subscription.lockedPromoPrice && (
                <p className="text-xs text-green-600 dark:text-green-400 font-semibold mt-0.5">
                  Você assinou no preço promocional — mantido enquanto renovar em dia
                </p>
              )}
            </div>

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
                  {isResolvedPromoActive(plan) ? (
                    <div className="mb-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-black">
                          {getResolvedPrice(plan).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
                        <span className="text-xs font-normal text-muted-foreground">/mês</span>
                        <span className="text-xs text-muted-foreground line-through">
                          {plan.monthlyPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
                      </div>
                      {plan.promoEndsAt && (
                        <p className="text-[10px] text-red-500 font-semibold">
                          Até {new Date(plan.promoEndsAt).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mb-1">
                      <p className="text-xl font-black">
                        {getResolvedPrice(plan).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        <span className="text-xs font-normal text-muted-foreground">/mês</span>
                      </p>
                      {isPlanPromoActive(plan) && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Promoção disponível apenas para novos clientes e upgrades
                        </p>
                      )}
                    </div>
                  )}
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
                      {actionLabel(plan)} <ArrowRight className="h-3 w-3" />
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
      <Dialog
        open={!!selectedPlan}
        onOpenChange={(o) => { if (!o) { handleCheckoutDialogClose() } }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {(isActive || isTrial) ? "Confirmar troca de plano" : "Confirmar assinatura"}
            </DialogTitle>
            <DialogDescription>
              Escolha como prefere pagar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="font-bold">{selectedPlan?.name}</p>
              {selectedPlan && isResolvedPromoActive(selectedPlan) ? (
                <div className="mt-1">
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-black">
                      {getResolvedPrice(selectedPlan).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      <span className="text-sm font-normal text-muted-foreground">/mês</span>
                    </p>
                    <span className="text-sm text-muted-foreground line-through">
                      {selectedPlan.monthlyPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>
                  <p className="text-xs text-green-600 font-semibold mt-1">
                    Preço promocional — mantido enquanto renovar em dia
                  </p>
                </div>
              ) : (
                <div className="mt-1">
                  <p className="text-2xl font-black">
                    {selectedPlan ? getResolvedPrice(selectedPlan).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : ""}
                    <span className="text-sm font-normal text-muted-foreground">/mês</span>
                  </p>
                  {selectedPlan && isPlanPromoActive(selectedPlan) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Promoção disponível apenas para novos clientes e upgrades
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Seletor de método de pagamento */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("CreditCard")}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all text-sm font-medium ${
                  paymentMethod === "CreditCard"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                <CreditCard className="h-5 w-5" />
                Cartão
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("Pix")}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all text-sm font-medium ${
                  paymentMethod === "Pix"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                <QrCode className="h-5 w-5" />
                Pix
              </button>
            </div>

            {paymentMethod === "CreditCard" && (
              <p className="text-xs text-muted-foreground text-center">
                Você será redirecionado ao MercadoPago para inserir seus dados.
              </p>
            )}
            {paymentMethod === "Pix" && (
              <p className="text-xs text-muted-foreground text-center">
                Um QR Code Pix será gerado. Após o pagamento, sua assinatura é ativada automaticamente.
              </p>
            )}

            {error && <p className="text-sm text-destructive font-medium">{error}</p>}
            <Button onClick={handleConfirmPlan} disabled={submitting} className="w-full">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {paymentMethod === "Pix" ? "Gerar QR Code Pix" : "Ir para pagamento"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Pix QR Code */}
      <Dialog open={!!pixData} onOpenChange={(o) => { if (!o) { setPixData(null); stopPolling() } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Pagar com Pix
            </DialogTitle>
            <DialogDescription>
              Escaneie o QR Code ou copie o código Pix copia e cola.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {pixStatus === "approved" ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <p className="font-bold text-green-600">Pagamento confirmado!</p>
                <p className="text-sm text-muted-foreground text-center">Sua assinatura está sendo ativada...</p>
              </div>
            ) : pixStatus === "failed" ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <p className="font-bold text-destructive">Pagamento não aprovado</p>
                <p className="text-sm text-muted-foreground text-center">Tente novamente ou escolha outro método.</p>
                <Button variant="outline" size="sm" onClick={() => { setPixData(null); setSelectedPlan(selectedPlan) }}>
                  Tentar novamente
                </Button>
              </div>
            ) : (
              <>
                {pixData?.qrCodeBase64 && (
                  <div className="flex justify-center">
                    <div className="rounded-xl border border-border p-2 bg-white">
                      <Image
                        src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                        alt="QR Code Pix"
                        width={192}
                        height={192}
                        className="rounded-lg"
                      />
                    </div>
                  </div>
                )}
                <div className="rounded-lg bg-muted/60 p-3 flex items-start gap-2">
                  <p className="text-xs font-mono text-muted-foreground break-all flex-1 line-clamp-3">
                    {pixData?.qrCode}
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                    title="Copiar código Pix"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <Button variant="outline" className="w-full" onClick={handleCopyPix}>
                  {copied ? (
                    <><Check className="mr-2 h-4 w-4 text-green-500" />Copiado!</>
                  ) : (
                    <><Copy className="mr-2 h-4 w-4" />Copiar código Pix</>
                  )}
                </Button>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Aguardando confirmação do pagamento...
                </div>
                {pixData?.expiresAt && (
                  <p className="text-center text-xs text-muted-foreground">
                    Expira em {new Date(pixData.expiresAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
