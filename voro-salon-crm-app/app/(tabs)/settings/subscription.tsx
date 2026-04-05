import React from "react"
import { View, Text, ScrollView, ActivityIndicator, Pressable } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import useSWR from "swr"
import { fetcher } from "lib/fetcher"
import { API_CONFIG } from "lib/api"
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

  const { data: sub, isLoading } = useSWR<any>(
    API_CONFIG.ENDPOINTS.SUBSCRIPTION_ME,
    fetcher
  )

  const { data: _clientsData } = useSWR<any>(`${API_CONFIG.ENDPOINTS.CLIENTS}?pageSize=1`, fetcher)
  const { data: _employeesData } = useSWR<any>(`${API_CONFIG.ENDPOINTS.EMPLOYEES}?pageSize=1`, fetcher)
  const clientsData = { length: _clientsData?.totalCount ?? (_clientsData?.items?.length ?? 0) }
  const employeesData = { length: _employeesData?.totalCount ?? (_employeesData?.items?.length ?? 0) }

  const roleNames = user?.roles?.map((r: any) => r.name) ?? []
  const isSalonOwner = roleNames.includes("SalonOwner") || roleNames.includes("Owner")

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

  let statusColor = "#16a34a" // green
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
  const price = sub?.monthlyPrice || sub?.plan?.monthlyPrice || sub?.price || 0
  const maxClients = sub?.maxClients || sub?.plan?.maxClients || -1
  const maxEmployees = sub?.maxEmployees || sub?.plan?.maxEmployees || -1

  const currentClients = clientsData?.length ?? 0
  const currentEmployees = employeesData?.length ?? 0

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
              Escolha um plano no site para liberar todos os recursos.
            </Text>
          </View>
        )}

        {/* Limites da Conta */}
        <Text className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-3">
          Limites do Plano Atual
        </Text>

        <View className="bg-white rounded-3xl p-5 border border-zinc-100 mb-6 gap-5">
          {/* Clientes */}
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

          {/* Funcionários */}
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

        {/* Mensagem e CTA */}
        {isPastDue && (
          <View className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6">
            <Text className="text-red-800 font-bold text-sm mb-1">Atenção!</Text>
            <Text className="text-red-700 text-xs">O pagamento da sua última fatura falhou. Atualize os dados de pagamento para não perder o acesso ao sistema.</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}
