import React, { useState } from "react"
import { View, Text, ScrollView, ActivityIndicator, Pressable, RefreshControl } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import useSWR from "swr"
import { API_CONFIG } from "lib/api"
import { fetcher } from "lib/fetcher"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { ScreenHeader } from "components/ScreenHeader"

export default function MyCommissions() {
  const { primaryColor } = useTenantTheme()
  const [period, setPeriod] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  })

  const { data: me } = useSWR<any>(API_CONFIG.ENDPOINTS.EMPLOYEE_ME, fetcher)

  const fromDate = `${period.year}-${String(period.month).padStart(2, "0")}-01`
  const lastDay = new Date(period.year, period.month, 0).getDate()
  const toDate = `${period.year}-${String(period.month).padStart(2, "0")}-${lastDay}`

  const { data: commissions, isLoading, mutate } = useSWR<any[]>(
    me?.id ? `${API_CONFIG.ENDPOINTS.EMPLOYEES}/${me.id}/commissions?from=${fromDate}&to=${toDate}` : null,
    fetcher
  )

  function prevMonth() {
    setPeriod(p => {
      const d = new Date(p.year, p.month - 2)
      return { year: d.getFullYear(), month: d.getMonth() + 1 }
    })
  }

  function nextMonth() {
    setPeriod(p => {
      const d = new Date(p.year, p.month)
      return { year: d.getFullYear(), month: d.getMonth() + 1 }
    })
  }

  const total = (commissions ?? []).reduce((sum, c) => sum + (c.amount || 0), 0)

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={[]}>
      <ScreenHeader title="Minhas Comissões" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => mutate()} tintColor={primaryColor} />}
      >
        {/* Seletor de período */}
        <View className="bg-white rounded-3xl border border-zinc-100 p-4 mb-4">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={prevMonth}
              className="h-10 w-10 bg-zinc-100 rounded-xl items-center justify-center"
            >
              <Ionicons name="chevron-back" size={18} color="#52525b" />
            </Pressable>
            <Text className="font-black text-zinc-900 text-base capitalize">
              {new Date(period.year, period.month - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </Text>
            <Pressable
              onPress={nextMonth}
              className="h-10 w-10 bg-zinc-100 rounded-xl items-center justify-center"
            >
              <Ionicons name="chevron-forward" size={18} color="#52525b" />
            </Pressable>
          </View>

          {/* Total */}
          <View className="mt-4 items-center">
            <Text className="text-zinc-500 text-sm font-semibold">Total do Período</Text>
            <Text className="text-3xl font-black mt-1" style={{ color: primaryColor }}>
              {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </Text>
          </View>
        </View>

        {/* Lista de comissões */}
        <View className="bg-white rounded-3xl border border-zinc-100 p-5">
          <Text className="text-base font-black text-zinc-900 mb-3">Detalhamento</Text>

          {isLoading ? (
            <View className="py-8 items-center">
              <ActivityIndicator color={primaryColor} />
            </View>
          ) : !commissions || commissions.length === 0 ? (
            <View className="py-8 items-center">
              <Ionicons name="cash-outline" size={40} color="#d4d4d8" />
              <Text className="text-zinc-400 font-semibold mt-3">Nenhuma comissão neste período</Text>
              <Text className="text-zinc-300 text-sm mt-1 text-center">As comissões aparecerão quando agendamentos forem concluídos</Text>
            </View>
          ) : (
            commissions.map((c) => (
              <View key={c.id} className="flex-row items-center justify-between py-3 border-b border-zinc-50">
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-semibold text-zinc-800 leading-tight" numberOfLines={2}>{c.description}</Text>
                  <Text className="text-xs text-zinc-400 mt-0.5">
                    {new Date(c.dueDate ?? c.createdAt).toLocaleDateString("pt-BR")}
                  </Text>
                </View>
                <View className="items-end ml-3">
                  <Text className="text-sm font-black" style={{ color: primaryColor }}>
                    {(c.amount as number).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </Text>
                  <View className={`rounded-lg px-2 py-0.5 mt-0.5 ${c.status === "Paid" ? "bg-emerald-100" : "bg-amber-100"}`}>
                    <Text className={`text-[10px] font-bold ${c.status === "Paid" ? "text-emerald-700" : "text-amber-700"}`}>
                      {c.status === "Paid" ? "Pago" : "Pendente"}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
