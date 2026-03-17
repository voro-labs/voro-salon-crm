import React, { useState } from "react"
import {
  View, Text, ScrollView, RefreshControl, Pressable,
  ActivityIndicator, Modal,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useAuth } from "contexts/auth.context"
import { useDashboard } from "hooks/use-dashboard.hook"
import useSWR from "swr"
import { fetcher } from "lib/fetcher"
import { API_CONFIG, secureApiCall } from "lib/api"
import type { TopClientItem, RevenueByMonthItem } from "types/DTOs/dashboard-data.interface"

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 0, label: "Pendente",   bg: "#fef9c3", text: "#854d0e", border: "#fef08a" },
  { value: 1, label: "Confirmado", bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  { value: 2, label: "Concluído",  bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" },
  { value: 3, label: "Cancelado",  bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
  { value: 4, label: "Faltou",     bg: "#f4f4f5", text: "#52525b", border: "#e4e4e7" },
] as const

function getStatus(value: number) {
  return STATUS_OPTIONS[value] ?? STATUS_OPTIONS[0]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function abbreviate(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return value.toFixed(0)
}

function formatTime(iso?: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

const TODAY_STR = new Date().toISOString().split("T")[0]

function isToday(iso?: string): boolean {
  if (!iso) return false
  return iso.split("T")[0] === TODAY_STR
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label, value, icon, color, sub,
}: {
  label: string
  value: string | number
  icon: React.ComponentProps<typeof Ionicons>["name"]
  color: string
  sub?: string
}) {
  return (
    <View className="flex-1 bg-white rounded-2xl p-4 border border-zinc-100">
      <View className="flex-row items-center justify-between mb-3">
        <View className="h-9 w-9 rounded-xl items-center justify-center" style={{ backgroundColor: color + "18" }}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
      </View>
      <Text className="text-xl font-black text-zinc-900" numberOfLines={1}>{value}</Text>
      <Text className="text-xs font-semibold text-zinc-500 mt-0.5">{label}</Text>
      {sub ? <Text className="text-xs text-zinc-400 mt-0.5">{sub}</Text> : null}
    </View>
  )
}

// ─── Revenue Bar Chart ────────────────────────────────────────────────────────

const BAR_MAX_H = 88

function RevenueChart({ data }: { data: RevenueByMonthItem[] }) {
  const max = Math.max(...data.map((d) => d.total), 1)
  const lastIdx = data.length - 1

  return (
    <View className="flex-row items-end justify-between px-1" style={{ height: BAR_MAX_H + 44 }}>
      {data.map((item, i) => {
        const barH = Math.max((item.total / max) * BAR_MAX_H, 4)
        const isCurrent = i === lastIdx
        return (
          <View key={i} className="flex-1 items-center mx-1">
            <Text
              className="text-xs font-bold mb-1.5"
              style={{ color: isCurrent ? "#7c3aed" : "#a1a1aa" }}
              numberOfLines={1}
            >
              {item.total > 0 ? abbreviate(item.total) : ""}
            </Text>
            <View
              className="w-full rounded-t-xl"
              style={{
                height: barH,
                backgroundColor: isCurrent ? "#7c3aed" : "#e4e4e7",
              }}
            />
            <Text
              className="text-xs font-semibold mt-1.5"
              style={{ color: isCurrent ? "#18181b" : "#a1a1aa" }}
            >
              {item.monthLabel}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

// ─── Today Appointment Card ───────────────────────────────────────────────────

function AppointmentCard({
  appointment,
  onStatusChange,
}: {
  appointment: any
  onStatusChange: (id: string, status: number) => void
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const status = getStatus(appointment.status ?? 0)
  const clientName = (appointment.clientName ?? `${appointment.client?.firstName ?? ""} ${appointment.client?.lastName ?? ""}`.trim()) || "Cliente"
  const serviceName = appointment.serviceName ?? appointment.service?.name ?? appointment.description ?? "Serviço"

  return (
    <>
      <View className="flex-row items-center gap-3 py-3 border-b border-zinc-50 last:border-0">
        <View className="h-10 w-10 bg-purple-50 rounded-2xl items-center justify-center shrink-0">
          <Text className="text-purple-700 font-black text-sm">{clientName[0]?.toUpperCase()}</Text>
        </View>

        <View className="flex-1 min-w-0">
          <Text className="text-zinc-900 font-bold text-sm" numberOfLines={1}>{clientName}</Text>
          <Text className="text-zinc-400 text-xs" numberOfLines={1}>{serviceName}</Text>
        </View>

        <View className="items-end gap-1.5 shrink-0">
          {appointment.scheduledDateTime ? (
            <Text className="text-zinc-500 text-xs font-semibold">{formatTime(appointment.scheduledDateTime)}</Text>
          ) : null}
          <Pressable
            onPress={() => setModalOpen(true)}
            className="rounded-full px-2.5 py-1 border"
            style={{ backgroundColor: status.bg, borderColor: status.border }}
          >
            <Text className="text-xs font-bold" style={{ color: status.text }}>{status.label}</Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <Pressable
          className="flex-1 bg-black/40 items-center justify-center px-8"
          onPress={() => setModalOpen(false)}
        >
          <Pressable className="bg-white rounded-3xl w-full overflow-hidden" onPress={(e) => e.stopPropagation()}>
            <View className="px-5 pt-5 pb-3 border-b border-zinc-100">
              <Text className="text-base font-black text-zinc-900">Alterar status</Text>
              <Text className="text-sm text-zinc-400 mt-0.5">{clientName}</Text>
            </View>
            {STATUS_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => {
                  onStatusChange(appointment.id, opt.value)
                  setModalOpen(false)
                }}
                className="flex-row items-center gap-3 px-5 py-4 active:bg-zinc-50"
              >
                <View className="h-3 w-3 rounded-full" style={{ backgroundColor: opt.text }} />
                <Text className="flex-1 text-zinc-900 font-semibold">{opt.label}</Text>
                {(appointment.status ?? 0) === opt.value && (
                  <Ionicons name="checkmark" size={18} color="#7c3aed" />
                )}
              </Pressable>
            ))}
            <View className="h-4" />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

// ─── Top Client Row ───────────────────────────────────────────────────────────

const MEDALS = ["🥇", "🥈", "🥉"]

function TopClientRow({ client, rank }: { client: TopClientItem; rank: number }) {
  return (
    <View className="flex-row items-center gap-3 py-3 border-b border-zinc-50">
      <Text className="text-lg w-7 text-center">{MEDALS[rank] ?? `${rank + 1}º`}</Text>
      <View className="h-9 w-9 bg-purple-50 rounded-xl items-center justify-center shrink-0">
        <Text className="text-purple-700 font-black text-sm">{client.name[0]?.toUpperCase()}</Text>
      </View>
      <View className="flex-1 min-w-0">
        <Text className="text-zinc-900 font-bold text-sm" numberOfLines={1}>{client.name}</Text>
        <Text className="text-zinc-400 text-xs">{client.serviceCount} {client.serviceCount === 1 ? "serviço" : "serviços"}</Text>
      </View>
      <Text className="text-purple-600 font-black text-sm shrink-0">R$ {fmtCurrency(client.totalSpent)}</Text>
    </View>
  )
}

// ─── Dashboard Screen ─────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const insets = useSafeAreaInsets()
  const { user, logout } = useAuth()
  const { dashboardData, loading, refetch } = useDashboard()

  const { data: appointments, mutate: mutateAppointments } = useSWR<any[]>(
    API_CONFIG.ENDPOINTS.APPOINTMENTS,
    fetcher
  )

  const todayAppointments = (appointments ?? [])
    .filter((a: any) => isToday(a.scheduledDateTime ?? a.date))
    .sort((a: any, b: any) => {
      const ta = a.scheduledDateTime ?? ""
      const tb = b.scheduledDateTime ?? ""
      return ta.localeCompare(tb)
    })

  async function handleStatusChange(id: string, newStatus: number) {
    mutateAppointments(
      (prev) => prev?.map((a) => a.id === id ? { ...a, status: newStatus } : a),
      false
    )
    try {
      await secureApiCall(`${API_CONFIG.ENDPOINTS.APPOINTMENTS}/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify(newStatus),
      })
    } finally {
      mutateAppointments()
    }
  }

  const revenue = dashboardData?.monthlyRevenue ?? dashboardData?.revenueThisMonth ?? 0
  const apptCount = dashboardData?.monthlyServiceCount ?? dashboardData?.appointmentsThisMonth ?? 0
  const totalClients = dashboardData?.totalClients ?? 0
  const revenueByMonth = dashboardData?.revenueByMonth ?? []
  const topClients = dashboardData?.topClients ?? []

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={[]}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => { refetch(); mutateAppointments() }}
            tintColor="#7c3aed"
          />
        }
      >
        {/* ── Header ── */}
        <View
          className="bg-white border-b border-zinc-100 px-5 pb-4"
          style={{ paddingTop: insets.top + 16 }}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-zinc-400 text-sm font-semibold">Bem-vindo de volta,</Text>
              <Text className="text-2xl font-black text-zinc-900">{user?.firstName ?? "Usuário"} 👋</Text>
            </View>
            <Pressable
              onPress={logout}
              className="h-10 w-10 bg-zinc-50 rounded-2xl items-center justify-center border border-zinc-100"
            >
              <Ionicons name="log-out-outline" size={20} color="#71717a" />
            </Pressable>
          </View>
        </View>

        <View className="px-4 pt-5 gap-4 pb-32">

          {loading && !dashboardData ? (
            <View className="items-center py-16">
              <ActivityIndicator color="#7c3aed" size="large" />
            </View>
          ) : (
            <>
              {/* ── 3 Summary Cards ── */}
              <View className="flex-row gap-3">
                <SummaryCard
                  label="Receita do mês"
                  value={`R$ ${fmtCurrency(revenue)}`}
                  icon="wallet-outline"
                  color="#7c3aed"
                />
                <SummaryCard
                  label="Atendimentos"
                  value={apptCount}
                  icon="calendar-outline"
                  color="#059669"
                  sub="este mês"
                />
                <SummaryCard
                  label="Clientes"
                  value={totalClients}
                  icon="people-outline"
                  color="#d97706"
                  sub="cadastrados"
                />
              </View>

              {/* ── Revenue Chart ── */}
              {revenueByMonth.length > 0 && (
                <View className="bg-white rounded-3xl p-5 border border-zinc-100">
                  <Text className="text-base font-black text-zinc-900 mb-1">Receita dos últimos 6 meses</Text>
                  <Text className="text-xs text-zinc-400 font-semibold mb-4">em R$</Text>
                  <RevenueChart data={revenueByMonth} />
                </View>
              )}

              {/* ── Today's Appointments ── */}
              <View className="bg-white rounded-3xl p-5 border border-zinc-100">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-base font-black text-zinc-900">Agendamentos de hoje</Text>
                  <View className="bg-purple-50 rounded-full px-2.5 py-0.5">
                    <Text className="text-purple-600 text-xs font-black">{todayAppointments.length}</Text>
                  </View>
                </View>
                <Text className="text-xs text-zinc-400 font-semibold mb-3">Toque no status para alterar</Text>

                {todayAppointments.length === 0 ? (
                  <View className="items-center py-8">
                    <Ionicons name="calendar-outline" size={36} color="#d4d4d8" />
                    <Text className="text-zinc-400 font-semibold text-sm mt-2">Nenhum agendamento hoje</Text>
                  </View>
                ) : (
                  todayAppointments.map((appt: any) => (
                    <AppointmentCard
                      key={appt.id}
                      appointment={appt}
                      onStatusChange={handleStatusChange}
                    />
                  ))
                )}
              </View>

              {/* ── Top Clients ── */}
              {topClients.length > 0 && (
                <View className="bg-white rounded-3xl p-5 border border-zinc-100">
                  <Text className="text-base font-black text-zinc-900 mb-1">Melhores clientes do mês</Text>
                  <Text className="text-xs text-zinc-400 font-semibold mb-3">por valor gasto</Text>
                  {topClients.slice(0, 5).map((client, i) => (
                    <TopClientRow key={i} client={client} rank={i} />
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
