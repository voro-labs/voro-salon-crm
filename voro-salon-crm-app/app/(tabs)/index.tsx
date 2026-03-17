import React from "react"
import { View, Text, ScrollView, RefreshControl, Pressable, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useAuth } from "contexts/auth.context"
import { useDashboard } from "hooks/use-dashboard.hook"

function MetricCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  return (
    <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm shadow-zinc-100 border border-zinc-100">
      <View className={`h-10 w-10 rounded-xl items-center justify-center mb-3`} style={{ backgroundColor: color + "20" }}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text className="text-2xl font-black text-zinc-900">{value}</Text>
      <Text className="text-xs text-zinc-500 font-semibold mt-1">{label}</Text>
    </View>
  )
}

export default function DashboardScreen() {
  const { user, logout } = useAuth()
  const { dashboardData, loading, refetch } = useDashboard()

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#7c3aed" />}
      >
        {/* Header */}
        <View className="bg-white px-6 pt-4 pb-6 rounded-b-3xl shadow-sm shadow-zinc-100">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-zinc-500 text-sm font-semibold">Bem-vindo,</Text>
              <Text className="text-xl font-black text-zinc-900">{user?.firstName ?? "Usuário"}</Text>
            </View>
            <Pressable onPress={logout} className="h-10 w-10 bg-zinc-50 rounded-xl items-center justify-center border border-zinc-100">
              <Ionicons name="log-out-outline" size={20} color="#71717a" />
            </Pressable>
          </View>
        </View>

        <View className="px-4 py-6 gap-6">
          {/* Metrics */}
          {loading && !dashboardData ? (
            <View className="items-center py-8"><ActivityIndicator color="#7c3aed" /></View>
          ) : (
            <>
              <View className="flex-row gap-3">
                <MetricCard label="Clientes" value={dashboardData?.totalClients ?? 0} icon="people-outline" color="#7c3aed" />
                <MetricCard label="Hoje" value={dashboardData?.appointmentsToday ?? 0} icon="calendar-outline" color="#059669" />
              </View>
              <View className="flex-row gap-3">
                <MetricCard label="Este mês" value={dashboardData?.appointmentsThisMonth ?? 0} icon="stats-chart-outline" color="#d97706" />
                <MetricCard label="Receita" value={`R$ ${(dashboardData?.revenueThisMonth ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon="wallet-outline" color="#dc2626" />
              </View>
            </>
          )}

          {/* Recent Alerts */}
          {dashboardData?.recentAlerts && dashboardData.recentAlerts.length > 0 && (
            <View>
              <Text className="text-base font-black text-zinc-900 mb-3">Alertas Recentes</Text>
              {dashboardData.recentAlerts.slice(0, 5).map((alert: any, i: number) => (
                <View key={i} className="bg-white rounded-2xl p-4 mb-2 border border-zinc-100 flex-row items-center gap-3">
                  <View className="h-9 w-9 bg-purple-50 rounded-xl items-center justify-center">
                    <Ionicons name="notifications-outline" size={18} color="#7c3aed" />
                  </View>
                  <Text className="flex-1 text-zinc-700 text-sm font-medium" numberOfLines={2}>{alert.message ?? JSON.stringify(alert)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
