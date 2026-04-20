import React, { useRef, useState } from "react"
import {
  View, Text, ScrollView, ActivityIndicator, Pressable, Modal,
  Image, Share, Alert,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import useSWR from "swr"
import { fetcher } from "lib/fetcher"
import { API_CONFIG, apiCall, secureApiCall } from "lib/api"
import { ScreenHeader } from "components/ScreenHeader"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { useAuth } from "contexts/auth.context"

function fmtDate(iso?: string) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}

export default function SubscriptionScreen() {
  const router = useRouter()
  const { primaryColor } = useTenantTheme()
  const { user } = useAuth()

  const { data: sub, isLoading, mutate } = useSWR<any>(
    API_CONFIG.ENDPOINTS.SUBSCRIPTION_ME,
    fetcher
  )

  const { data: plans } = useSWR<any[]>(
    API_CONFIG.ENDPOINTS.SUBSCRIPTION_PLANS,
    fetcher
  )

  const { data: tenant } = useSWR<any>(
    user ? API_CONFIG.ENDPOINTS.TENANT_ME : null,
    async (url: string) => {
      const res = await secureApiCall<any>(url, { method: "GET" })
      return res.hasError ? null : res.data
    }
  )

  const { data: _clientsData } = useSWR<any>(`${API_CONFIG.ENDPOINTS.CLIENTS}?pageSize=1`, fetcher)
  const { data: _employeesData } = useSWR<any>(`${API_CONFIG.ENDPOINTS.EMPLOYEES}?pageSize=1`, fetcher)
  const clientsData = { length: _clientsData?.totalCount ?? (_clientsData?.items?.length ?? 0) }
  const employeesData = { length: _employeesData?.totalCount ?? (_employeesData?.items?.length ?? 0) }

  const roleNames = user?.roles?.map((r: any) => r.name) ?? []
  const isSalonOwner = roleNames.includes("SalonOwner") || roleNames.includes("Owner")

  // Checkout state
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<"CreditCard" | "Pix">("CreditCard")
  const [submitting, setSubmitting] = useState(false)
  const [showMethodModal, setShowMethodModal] = useState(false)
  const [pixData, setPixData] = useState<{
    subscriptionId: string
    qrCode: string
    qrCodeBase64: string
    expiresAt: string
  } | null>(null)
  const [pixStatus, setPixStatus] = useState<"pending" | "approved" | "failed">("pending")
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const checkoutCompletedRef = useRef(false)

  // Resolved prices (preço correto por tenant)
  const { data: resolvedPrices } = useSWR<{ planId: string; displayPrice: number }[]>(
    API_CONFIG.ENDPOINTS.SUBSCRIPTION_RESOLVED_PRICES,
    async (url: string) => {
      const res = await secureApiCall<{ planId: string; displayPrice: number }[]>(url)
      return res.hasError ? [] : (res.data ?? [])
    },
    { fallbackData: [] }
  )

  function getResolvedPrice(plan: any): number {
    const found = resolvedPrices?.find((r) => r.planId === plan.id)
    if (found) return found.displayPrice
    if (isPlanPromoActiveCheck(plan)) return plan.promoPrice
    return plan.monthlyPrice
  }

  function isResolvedPromoActive(plan: any): boolean {
    const found = resolvedPrices?.find((r) => r.planId === plan.id)
    if (found) return found.displayPrice < plan.monthlyPrice
    return isPlanPromoActiveCheck(plan)
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-50 items-center justify-center">
        <ActivityIndicator color={primaryColor} size="large" />
      </SafeAreaView>
    )
  }

  const isTrial = sub?.status === "Trial" || sub?.status === 1
  const isPastDue = sub?.status === "PastDue" || sub?.status === 4
  const isCanceled = sub?.status === "Cancelled" || sub?.status === 3
  const isActive = sub?.status === "Active" || sub?.status === 0 || isTrial

  let statusColor = "#16a34a"
  let statusBg = "#dcfce7"
  let statusLabel = "Ativo"

  if (isTrial) {
    statusColor = "#0284c7"
    statusBg = "#e0f2fe"
    statusLabel = "Trial"
  } else if (isPastDue) {
    statusColor = "#dc2626"
    statusBg = "#fee2e2"
    statusLabel = "Pagamento Pendente"
  } else if (isCanceled) {
    statusColor = "#52525b"
    statusBg = "#e4e4e7"
    statusLabel = "Cancelado"
  }

  const planName = sub?.name || sub?.plan?.name
  const rawPrice = sub?.monthlyPrice || sub?.plan?.monthlyPrice || sub?.price || 0
  const lockedPromoPrice = sub?.lockedPromoPrice ?? null
  const planPromoPrice = sub?.plan?.promoPrice ?? null
  const planPromoEndsAt = sub?.plan?.promoEndsAt ?? null
  const isPlanPromoActive = planPromoPrice && (!planPromoEndsAt || new Date(planPromoEndsAt) > new Date())
  const price = lockedPromoPrice ?? (isPlanPromoActive ? planPromoPrice : rawPrice)
  const showPromo = !!(lockedPromoPrice || isPlanPromoActive)
  const maxClients = sub?.maxClients || sub?.plan?.maxClients || -1
  const maxEmployees = sub?.maxEmployees || sub?.plan?.maxEmployees || -1

  const currentClients = clientsData?.length ?? 0
  const currentEmployees = employeesData?.length ?? 0

  // Planos visíveis na grade:
  // - Ativo/Trial: apenas planos com preço MAIOR que o atual
  // - Inativo/Cancelado/PastDue: nenhum — mostramos botão Renovar no hero card
  const isInactiveOrCancelled = !isActive && !isPastDue
  const currentPrice = sub?.plan?.monthlyPrice ?? 0
  const visiblePlans = plans
    ? (isActive && !isPastDue ? plans.filter((p) => p.monthlyPrice > currentPrice) : [])
    : []

  function isPlanPromoActiveCheck(plan: any): boolean {
    if (!plan.promoPrice) return false
    if (!plan.promoEndsAt) return true
    return new Date(plan.promoEndsAt) > new Date()
  }

  // ── Polling ─────────────────────────────────────────────────────────────────

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  function startPixPolling(subscriptionId: string) {
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

  // ── Checkout ─────────────────────────────────────────────────────────────────

  const handleConfirm = async () => {
    if (!selectedPlan) return
    setSubmitting(true)
    checkoutCompletedRef.current = false
    try {
      const endpoint = (isActive || isTrial)
        ? API_CONFIG.ENDPOINTS.SUBSCRIPTION_CHANGE_PLAN
        : API_CONFIG.ENDPOINTS.SUBSCRIPTION_CHECKOUT
      const res = await apiCall<any>(endpoint, {
        method: "POST",
        body: JSON.stringify({
          planId: selectedPlan.id,
          tenantId: user?.currentTenantId ?? "",
          email: user?.email ?? "",
          name: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim(),
          salonName: tenant?.name ?? "",
          checkoutMethod: paymentMethod,
        }),
      })
      if (res.hasError || !res.data) {
        Alert.alert("Erro", res.message ?? "Erro ao iniciar checkout.")
        return
      }
      setShowMethodModal(false)
      if (res.data.pixQrCode) {
        setPixData({
          subscriptionId: res.data.subscriptionId,
          qrCode: res.data.pixQrCode,
          qrCodeBase64: res.data.pixQrCodeBase64 ?? "",
          expiresAt: res.data.pixExpiresAt ?? "",
        })
        setPixStatus("pending")
        startPixPolling(res.data.subscriptionId)
      } else if (res.data.checkoutUrl) {
        checkoutCompletedRef.current = true
        Alert.alert(
          "Pagamento via Cartão",
          "Abra o link no navegador para concluir o pagamento.",
          [
            { text: "Cancelar", style: "cancel" },
            { text: "Abrir link", onPress: () => Share.share({ message: res.data.checkoutUrl }) },
          ]
        )
      } else {
        checkoutCompletedRef.current = true
        await mutate()
        setSelectedPlan(null)
      }
    } catch {
      Alert.alert("Erro", "Erro inesperado. Tente novamente.")
    } finally {
      setSubmitting(false)
    }
  }

  const cancelPendingChange = async () => {
    if (!(isActive || isTrial) || checkoutCompletedRef.current) return
    try {
      await apiCall(API_CONFIG.ENDPOINTS.SUBSCRIPTION_PENDING_CANCEL, { method: "DELETE" })
    } catch { /* ignore */ }
  }

  const handleSharePix = async () => {
    if (!pixData) return
    try {
      await Share.share({ message: pixData.qrCode })
    } catch { }
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={["bottom"]}>
      <ScreenHeader title="Assinatura" showBack onBack={() => router.back()} />

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>

        {/* Hero Card */}
        {planName ? (
          <View className="bg-white rounded-3xl p-6 border border-zinc-100 items-center mb-6">
            <View className="h-20 w-20 rounded-3xl items-center justify-center mb-4" style={{ backgroundColor: primaryColor + "15" }}>
              <Ionicons name="ribbon-outline" size={36} color={primaryColor} />
            </View>
            <Text className="text-2xl font-black text-zinc-900 mb-2">{planName}</Text>

            <View className="rounded-xl px-3 py-1 mb-4" style={{ backgroundColor: statusBg }}>
              <Text className="text-xs font-bold uppercase tracking-wider" style={{ color: statusColor }}>
                {statusLabel}
              </Text>
            </View>

            <Text className="text-4xl font-black text-zinc-900 mb-1">
              R$ {price.toFixed(2).replace(".", ",")}
              <Text className="text-lg text-zinc-400 font-semibold">/mês</Text>
            </Text>
            {showPromo && (
              <Text className="text-sm text-zinc-400 mb-1" style={{ textDecorationLine: "line-through" }}>
                R$ {rawPrice.toFixed(2).replace(".", ",")}
              </Text>
            )}
            {showPromo && (
              <Text className="text-xs font-semibold text-green-600 mb-1">
                Preço promocional garantido
              </Text>
            )}

            {isTrial && sub?.trialEndsAt && (
              <Text className="text-zinc-500 text-sm mt-2 font-medium">
                Trial acaba em {fmtDate(sub.trialEndsAt)}
              </Text>
            )}

            {isActive && sub?.nextPaymentAt && !isTrial && (
              <Text className="text-zinc-500 text-sm mt-2 font-medium">
                Próxima cobrança em {fmtDate(sub.nextPaymentAt)}
              </Text>
            )}
          </View>
        ) : (
          <View className="bg-white rounded-3xl p-8 border border-zinc-100 border-dashed items-center mb-6">
            <Ionicons name="alert-circle-outline" size={48} color="#d4d4d8" />
            <Text className="text-zinc-500 font-bold mt-3 text-center">Nenhuma assinatura ativa</Text>
            <Text className="text-zinc-400 text-xs text-center mt-1 px-4">
              Escolha um plano abaixo para liberar todos os recursos.
            </Text>
          </View>
        )}

        {/* Botão Renovar para assinatura inativa/cancelada */}
        {!isActive && !isPastDue && planName && isSalonOwner && (
          <View style={{ marginBottom: 24 }}>
            <Pressable
              onPress={() => {
                const currentPlan = sub?.plan ?? sub
                if (currentPlan) {
                  setSelectedPlan(currentPlan)
                  setPaymentMethod("CreditCard")
                  checkoutCompletedRef.current = false
                  setShowMethodModal(true)
                }
              }}
              className="rounded-2xl p-4 items-center flex-row justify-center gap-2"
              style={{ backgroundColor: primaryColor }}
            >
              <Ionicons name="reload-outline" size={18} color="#fff" />
              <Text className="text-white font-bold text-base">Renovar Assinatura</Text>
            </Pressable>
          </View>
        )}

        {isPastDue && isSalonOwner && (
          <View style={{ marginBottom: 24 }}>
            <Pressable
              onPress={() => {
                const currentPlan = sub?.plan ?? sub
                if (currentPlan) {
                  setSelectedPlan(currentPlan)
                  setPaymentMethod("CreditCard")
                  checkoutCompletedRef.current = false
                  setShowMethodModal(true)
                }
              }}
              className="rounded-2xl p-4 items-center flex-row justify-center gap-2"
              style={{ backgroundColor: primaryColor }}
            >
              <Ionicons name="reload-outline" size={18} color="#fff" />
              <Text className="text-white font-bold text-base">Regularizar Pagamento</Text>
            </Pressable>
          </View>
        )}

        {/* Limites da Conta */}
        <Text className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-3">
          Limites do Plano Atual
        </Text>

        <View className="bg-white rounded-3xl p-5 border border-zinc-100 mb-6 gap-5">
          <View>
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-2">
                <View className="h-8 w-8 rounded-xl items-center justify-center bg-zinc-50 border border-zinc-100">
                  <Ionicons name="people-outline" size={16} color="#71717a" />
                </View>
                <Text className="text-zinc-700 font-bold text-sm">Clientes</Text>
              </View>
              <Text className="text-zinc-900 font-bold text-sm">
                {maxClients === -1 ? "Ilimitado" : `${currentClients} / ${maxClients}`}
              </Text>
            </View>
            {maxClients > 0 && (
              <View className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                <View
                  className="h-full rounded-full"
                  style={{ backgroundColor: primaryColor, width: `${Math.min(100, (currentClients / maxClients) * 100)}%` }}
                />
              </View>
            )}
          </View>

          <View>
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-2">
                <View className="h-8 w-8 rounded-xl items-center justify-center bg-zinc-50 border border-zinc-100">
                  <Ionicons name="id-card-outline" size={16} color="#71717a" />
                </View>
                <Text className="text-zinc-700 font-bold text-sm">Funcionários</Text>
              </View>
              <Text className="text-zinc-900 font-bold text-sm">
                {maxEmployees === -1 ? "Ilimitado" : `${currentEmployees} / ${maxEmployees}`}
              </Text>
            </View>
            {maxEmployees > 0 && (
              <View className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                <View
                  className="h-full rounded-full"
                  style={{ backgroundColor: primaryColor, width: `${Math.min(100, (currentEmployees / maxEmployees) * 100)}%` }}
                />
              </View>
            )}
          </View>
        </View>

        {/* Alertas */}
        {isPastDue && (
          <View className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6">
            <Text className="text-red-800 font-bold text-sm mb-1">Atenção!</Text>
            <Text className="text-red-700 text-xs">O pagamento da sua última fatura falhou. Renove abaixo para não perder o acesso.</Text>
          </View>
        )}

        {/* Seleção de planos — somente para usuários ativos com upgrades disponíveis */}
        {isSalonOwner && isActive && !isPastDue && visiblePlans.length > 0 && (
          <>
            <Text className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-3">
              {isActive && !isPastDue ? "Fazer Upgrade" : "Escolher Plano"}
            </Text>

            <View className="gap-3 mb-6">
              {visiblePlans.map((plan) => {
                const promoActive = isResolvedPromoActive(plan)
                const hasGlobalPromo = isPlanPromoActiveCheck(plan)
                const effectivePrice = getResolvedPrice(plan)
                const isSelected = selectedPlan?.id === plan.id
                return (
                  <Pressable
                    key={plan.id}
                    onPress={() => {
                      setSelectedPlan(plan)
                      setPaymentMethod("CreditCard")
                      checkoutCompletedRef.current = false
                      setShowMethodModal(true)
                    }}
                    className="bg-white rounded-2xl p-5 border border-zinc-100"
                    style={{ borderColor: isSelected ? primaryColor : undefined }}
                  >
                    <View className="flex-row items-start justify-between mb-1">
                      <Text className="font-black text-zinc-900 text-base flex-1">{plan.name}</Text>
                      {promoActive && (
                        <View className="rounded-lg px-2 py-0.5 ml-2" style={{ backgroundColor: primaryColor + "18" }}>
                          <Text className="text-xs font-bold" style={{ color: primaryColor }}>Promo</Text>
                        </View>
                      )}
                    </View>

                    <View className="flex-row items-baseline gap-2 mb-1">
                      <Text className="text-2xl font-black text-zinc-900">
                        R$ {effectivePrice.toFixed(2).replace(".", ",")}
                        <Text className="text-sm font-normal text-zinc-400">/mês</Text>
                      </Text>
                      {promoActive && (
                        <Text className="text-sm text-zinc-400" style={{ textDecorationLine: "line-through" }}>
                          R$ {plan.monthlyPrice.toFixed(2).replace(".", ",")}
                        </Text>
                      )}
                    </View>

                    {promoActive && plan.promoEndsAt && (
                      <Text className="text-xs text-red-500 font-semibold mb-1">
                        Promoção até {new Date(plan.promoEndsAt).toLocaleDateString("pt-BR")}
                      </Text>
                    )}

                    {!promoActive && hasGlobalPromo && (
                      <Text className="text-xs text-zinc-400 mb-1">
                        Promoção disponível apenas para novos clientes ou upgrades
                      </Text>
                    )}

                    <Text className="text-zinc-400 text-xs mb-3">{plan.description}</Text>

                    <View className="flex-row items-center justify-between">
                      <Text className="text-xs text-zinc-400">
                        {plan.maxClients === -1 ? "Clientes ilimitados" : `Até ${plan.maxClients} clientes`}
                      </Text>
                      <View className="flex-row items-center gap-1">
                        <Text className="text-xs font-bold" style={{ color: primaryColor }}>Assinar</Text>
                        <Ionicons name="arrow-forward" size={12} color={primaryColor} />
                      </View>
                    </View>
                  </Pressable>
                )
              })}
            </View>
          </>
        )}

      </ScrollView>

      {/* ── Modal: Método de Pagamento ─────────────────────────────────────── */}
      <Modal
        visible={showMethodModal}
        animationType="slide"
        transparent
        onRequestClose={() => { cancelPendingChange(); setShowMethodModal(false) }}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl p-6" style={{ paddingBottom: 36 }}>
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-lg font-black text-zinc-900">Forma de pagamento</Text>
              <Pressable onPress={() => { cancelPendingChange(); setShowMethodModal(false) }} hitSlop={12}>
                <Ionicons name="close" size={22} color="#71717a" />
              </Pressable>
            </View>

            {/* Plano selecionado */}
            {selectedPlan && (
              <View className="bg-zinc-50 rounded-2xl p-4 mb-5 border border-zinc-100">
                <Text className="font-bold text-zinc-900 mb-1">{selectedPlan.name}</Text>
                {isResolvedPromoActive(selectedPlan) ? (
                  <View className="flex-row items-baseline gap-2">
                    <Text className="text-xl font-black text-zinc-900">
                      R$ {getResolvedPrice(selectedPlan).toFixed(2).replace(".", ",")}
                      <Text className="text-sm font-normal text-zinc-400">/mês</Text>
                    </Text>
                    <Text className="text-sm text-zinc-400" style={{ textDecorationLine: "line-through" }}>
                      R$ {selectedPlan.monthlyPrice.toFixed(2).replace(".", ",")}
                    </Text>
                  </View>
                ) : (
                  <Text className="text-xl font-black text-zinc-900">
                    R$ {getResolvedPrice(selectedPlan).toFixed(2).replace(".", ",")}
                    <Text className="text-sm font-normal text-zinc-400">/mês</Text>
                  </Text>
                )}
              </View>
            )}

            {/* Seletor */}
            <View className="flex-row gap-3 mb-5">
              <Pressable
                onPress={() => setPaymentMethod("CreditCard")}
                className="flex-1 rounded-2xl border p-4 items-center gap-2"
                style={{
                  borderColor: paymentMethod === "CreditCard" ? primaryColor : "#e4e4e7",
                  backgroundColor: paymentMethod === "CreditCard" ? primaryColor + "0D" : "#fff",
                }}
              >
                <Ionicons
                  name="card-outline"
                  size={28}
                  color={paymentMethod === "CreditCard" ? primaryColor : "#71717a"}
                />
                <Text className="text-sm font-bold" style={{ color: paymentMethod === "CreditCard" ? primaryColor : "#71717a" }}>
                  Cartão
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setPaymentMethod("Pix")}
                className="flex-1 rounded-2xl border p-4 items-center gap-2"
                style={{
                  borderColor: paymentMethod === "Pix" ? primaryColor : "#e4e4e7",
                  backgroundColor: paymentMethod === "Pix" ? primaryColor + "0D" : "#fff",
                }}
              >
                <Ionicons
                  name="qr-code-outline"
                  size={28}
                  color={paymentMethod === "Pix" ? primaryColor : "#71717a"}
                />
                <Text className="text-sm font-bold" style={{ color: paymentMethod === "Pix" ? primaryColor : "#71717a" }}>
                  Pix
                </Text>
              </Pressable>
            </View>

            <Text className="text-xs text-zinc-400 text-center mb-5">
              {paymentMethod === "Pix"
                ? "Gera QR Code Pix. Após pagamento, a assinatura é ativada automaticamente."
                : "Você receberá o link do MercadoPago para inserir os dados do cartão."}
            </Text>

            <Pressable
              onPress={handleConfirm}
              disabled={submitting}
              className="rounded-2xl p-4 items-center justify-center"
              style={{ backgroundColor: primaryColor, opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-white font-bold text-base">
                  {paymentMethod === "Pix" ? "Gerar QR Code Pix" : "Ir para pagamento"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Modal: QR Code Pix ──────────────────────────────────────────────── */}
      <Modal
        visible={!!pixData}
        animationType="slide"
        transparent
        onRequestClose={() => { cancelPendingChange(); setPixData(null); stopPolling() }}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6" style={{ paddingBottom: 36 }}>

            {pixStatus === "approved" ? (
              <View className="items-center py-8 gap-4">
                <Ionicons name="checkmark-circle" size={72} color="#16a34a" />
                <Text className="text-xl font-black text-green-700">Pagamento confirmado!</Text>
                <Text className="text-zinc-400 text-sm text-center">Sua assinatura está sendo ativada...</Text>
              </View>
            ) : pixStatus === "failed" ? (
              <View className="items-center py-8 gap-4">
                <Ionicons name="close-circle" size={72} color="#dc2626" />
                <Text className="text-xl font-black text-red-700">Pagamento não aprovado</Text>
                <Text className="text-zinc-400 text-sm text-center">Tente novamente ou escolha outro método.</Text>
                <Pressable
                  onPress={() => { setPixData(null); setShowMethodModal(true) }}
                  className="mt-2 border border-zinc-200 rounded-2xl px-5 py-3"
                >
                  <Text className="text-zinc-700 font-bold">Tentar novamente</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View className="flex-row items-center justify-between mb-5">
                  <Text className="text-lg font-black text-zinc-900">Pagar com Pix</Text>
                  <Pressable onPress={() => { cancelPendingChange(); setPixData(null); stopPolling() }} hitSlop={12}>
                    <Ionicons name="close" size={22} color="#71717a" />
                  </Pressable>
                </View>

                {/* QR Code */}
                {pixData?.qrCodeBase64 ? (
                  <View className="items-center mb-5">
                    <View className="border border-zinc-100 rounded-2xl p-2 bg-white">
                      <Image
                        source={{ uri: `data:image/png;base64,${pixData.qrCodeBase64}` }}
                        style={{ width: 200, height: 200, borderRadius: 12 }}
                        resizeMode="contain"
                      />
                    </View>
                  </View>
                ) : null}

                <Text className="text-xs text-zinc-400 text-center mb-3">
                  Escaneie o QR Code ou compartilhe o código Pix
                </Text>

                {/* Código copia-e-cola */}
                <View className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 mb-4">
                  <Text className="text-xs font-mono text-zinc-500" numberOfLines={3}>
                    {pixData?.qrCode}
                  </Text>
                </View>

                <Pressable
                  onPress={handleSharePix}
                  className="rounded-2xl border border-zinc-200 p-4 items-center flex-row justify-center gap-2 mb-4"
                >
                  <Ionicons name="share-outline" size={18} color="#71717a" />
                  <Text className="text-zinc-700 font-bold text-sm">Compartilhar código Pix</Text>
                </Pressable>

                {pixData?.expiresAt && (
                  <Text className="text-xs text-zinc-400 text-center mb-3">
                    Expira às {new Date(pixData.expiresAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                )}

                <View className="flex-row items-center justify-center gap-2">
                  <ActivityIndicator size="small" color={primaryColor} />
                  <Text className="text-xs text-zinc-400">Aguardando confirmação do pagamento...</Text>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
