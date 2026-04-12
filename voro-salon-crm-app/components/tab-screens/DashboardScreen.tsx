import React, { useState, useMemo, useEffect, useCallback, useRef } from "react"
import {
  View, Text, ScrollView, RefreshControl, Pressable,
  ActivityIndicator, Modal, Alert, Share, TouchableOpacity,
} from "react-native"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useAuth } from "contexts/auth.context"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { useDashboard } from "hooks/use-dashboard.hook"
import { usePlanLimits } from "hooks/use-plan-limits.hook"
import { useWhatsApp } from "hooks/use-whatsapp.hook"
import useSWR, { useSWRConfig } from "swr"
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

const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

function fmtCurrency(value: number) {
  return (value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function abbreviate(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return (value || 0).toFixed(0)
}

function parseDateInfo(iso?: string): { day: string; month: string; time: string } | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return {
    day: String(d.getDate()).padStart(2, "0"),
    month: MONTHS_SHORT[d.getMonth()],
    time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
  }
}

function isToday(iso?: string): boolean {
  if (!iso) return false
  const d = new Date(iso)
  const today = new Date()
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  )
}

function isWithinNext7Days(iso?: string): boolean {
  if (!iso) return false
  const d = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const next7 = new Date(today)
  next7.setDate(today.getDate() + 7)
  next7.setHours(23, 59, 59, 999)
  
  return d >= today && d <= next7
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
  const { primaryColor } = useTenantTheme()
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
              style={{ color: isCurrent ? primaryColor : "#a1a1aa" }}
              numberOfLines={1}
            >
              {item.total > 0 ? abbreviate(item.total) : ""}
            </Text>
            <View
              className="w-full rounded-t-xl"
              style={{
                height: barH,
                backgroundColor: isCurrent ? primaryColor : "#e4e4e7",
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

// ─── Dashboard Appointment Card ───────────────────────────────────────────────

function AppointmentCard({
  appointment,
  onStatusChange,
  onPress,
  isUpdating,
}: {
  appointment: any
  onStatusChange: (id: string, status: number) => void
  onPress: () => void
  isUpdating?: boolean
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const { primaryColor } = useTenantTheme()
  const status = useMemo(() => getStatus(appointment.status ?? 0), [appointment.status])
  const clientName = (appointment.clientName ?? `${appointment.client?.firstName ?? ""} ${appointment.client?.lastName ?? ""}`.trim()) || "Cliente"
  const serviceName = appointment.serviceName ?? appointment.service?.name ?? appointment.description ?? "Serviço"
  const dateInfo = useMemo(() => parseDateInfo(appointment.scheduledDateTime ?? appointment.date), [appointment.scheduledDateTime, appointment.date])

  return (
    <>
      <Pressable
        onPress={onPress}
        className="flex-row items-center gap-3 py-3 border-b border-zinc-50 active:bg-zinc-50/80"
      >
        {/* Date block */}
        {dateInfo ? (
          <View className="w-12 items-center justify-center rounded-2xl py-2.5 shrink-0" style={{ backgroundColor: primaryColor + "15" }}>
            <Text className="text-lg font-black leading-tight" style={{ color: primaryColor }}>{dateInfo.day}</Text>
            <Text className="text-[10px] font-bold uppercase tracking-wide" style={{ color: primaryColor + "99" }}>{dateInfo.month}</Text>
          </View>
        ) : (
          <View className="h-12 w-12 rounded-2xl items-center justify-center shrink-0" style={{ backgroundColor: primaryColor + "15" }}>
            <Text className="font-black text-sm" style={{ color: primaryColor }}>{clientName[0]?.toUpperCase()}</Text>
          </View>
        )}

        {/* Content */}
        <View className="flex-1 min-w-0">
          {/* Time + Status badge */}
          <View className="flex-row items-center gap-2 mb-1">
            {dateInfo?.time ? (
              <View className="flex-row items-center gap-1">
                <Ionicons name="time-outline" size={11} color={primaryColor} />
                <Text className="text-xs font-bold" style={{ color: primaryColor }}>{dateInfo.time}</Text>
              </View>
            ) : null}
            <View className="rounded-full px-2 py-0.5 border" style={{ backgroundColor: status.bg, borderColor: status.border }}>
              <Text className="text-[10px] font-bold" style={{ color: status.text }}>{status.label}</Text>
            </View>
          </View>
          <Text className="text-zinc-900 font-bold text-sm" numberOfLines={1}>{clientName}</Text>
          <Text className="text-zinc-400 text-xs mt-0.5" numberOfLines={1}>{serviceName}</Text>
        </View>

        {/* Right: status action + chevron */}
        <View className="items-center gap-2 shrink-0">
          {isUpdating ? (
            <ActivityIndicator size="small" color={primaryColor} />
          ) : (
            <Pressable
              onPress={() => setModalOpen(true)}
              className="h-8 w-8 rounded-xl items-center justify-center border"
              style={{ backgroundColor: status.bg, borderColor: status.border }}
            >
              <Ionicons name="create-outline" size={14} color={status.text} />
            </Pressable>
          )}
          <Ionicons name="chevron-forward" size={15} color="#d4d4d8" />
        </View>
      </Pressable>

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
                <View className="h-3 w-3 rounded-2xl" style={{ backgroundColor: opt.text }} />
                <Text className="flex-1 text-zinc-900 font-semibold">{opt.label}</Text>
                {(appointment.status ?? 0) === opt.value && (
                  <Ionicons name="checkmark" size={18} color={primaryColor} />
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
  const { primaryColor } = useTenantTheme()
  return (
    <View className="flex-row items-center gap-3 py-3 border-b border-zinc-50">
      <Text className="text-lg w-7 text-center">{MEDALS[rank] ?? `${rank + 1}º`}</Text>
      <View className="h-9 w-9 rounded-xl items-center justify-center shrink-0" style={{ backgroundColor: primaryColor + "15" }}>
        <Text className="font-black text-sm" style={{ color: primaryColor }}>{client.name[0]?.toUpperCase()}</Text>
      </View>
      <View className="flex-1 min-w-0">
        <Text className="text-zinc-900 font-bold text-sm" numberOfLines={1}>{client.name}</Text>
        <Text className="text-zinc-400 text-xs">{client.serviceCount} {client.serviceCount === 1 ? "serviço" : "serviços"}</Text>
      </View>
      <Text className="font-black text-sm shrink-0" style={{ color: primaryColor }}>R$ {fmtCurrency(client.totalSpent)}</Text>
    </View>
  )
}

// ─── Tenant Switcher ──────────────────────────────────────────────────────────

function TenantSwitcher({
  tenants,
  currentTenantId,
  onSwitch,
}: {
  tenants: { id: string; name: string; slug: string; logoUrl?: string }[]
  currentTenantId: string
  onSwitch: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const { primaryColor } = useTenantTheme()
  const current = useMemo(() => tenants.find((t) => t.id === currentTenantId) ?? tenants[0], [tenants, currentTenantId])

  if (tenants.length <= 1) {
    return (
      <View className="flex-row items-center gap-2 mt-1">
        <Ionicons name="storefront-outline" size={13} color="#a1a1aa" />
        <Text className="text-zinc-400 text-xs font-semibold" numberOfLines={1}>
          {current?.name ?? "—"}
        </Text>
      </View>
    )
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center gap-2 mt-1 self-start"
      >
        <Ionicons name="storefront-outline" size={13} color={primaryColor} />
        <Text className="text-xs font-bold" style={{ color: primaryColor }} numberOfLines={1}>
          {current?.name ?? "—"}
        </Text>
        <Ionicons name="chevron-down" size={12} color={primaryColor} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setOpen(false)}
        >
          <Pressable
            className="bg-white rounded-t-3xl overflow-hidden"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="px-5 pt-5 pb-3 border-b border-zinc-100">
              <Text className="text-base font-black text-zinc-900">Trocar salão</Text>
              <Text className="text-sm text-zinc-400 mt-0.5">Selecione o salão que deseja acessar</Text>
            </View>

            {tenants.map((tenant) => {
              const isActive = tenant.id === currentTenantId
              return (
                <Pressable
                  key={tenant.id}
                  onPress={() => {
                    setOpen(false)
                    if (!isActive) onSwitch(tenant.id)
                  }}
                  className="flex-row items-center gap-3 px-5 py-4 active:bg-zinc-50"
                >
                  <View
                    className="h-10 w-10 rounded-2xl items-center justify-center shrink-0"
                    style={{ backgroundColor: isActive ? primaryColor + "20" : "#f4f4f5" }}
                  >
                    <Ionicons
                      name="storefront-outline"
                      size={18}
                      color={isActive ? primaryColor : "#71717a"}
                    />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text
                      className="font-bold text-sm"
                      style={{ color: isActive ? primaryColor : "#18181b" }}
                      numberOfLines={1}
                    >
                      {tenant.name}
                    </Text>
                    <Text className="text-zinc-400 text-xs" numberOfLines={1}>@{tenant.slug}</Text>
                  </View>
                  {isActive && <Ionicons name="checkmark-circle" size={20} color={primaryColor} />}
                </Pressable>
              )
            })}
            <View className="h-8" />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

// ─── Dashboard Screen Component ───────────────────────────────────────────────

export function DashboardScreen({ rootPath = "/(tabs)" }: { rootPath?: string }) {
  const insets = useSafeAreaInsets()
  const { user, logout, switchTenant } = useAuth()
  const { dashboardData, loading, refetch } = useDashboard()
  const { maxClients, hasBooking } = usePlanLimits()
  const { mutate: mutateAll } = useSWRConfig()
  const { sendWhatsAppMessage } = useWhatsApp()
  const router = useRouter()

  const { primaryColor, reload: reloadTheme } = useTenantTheme()

  const tenants = user?.tenants ?? []
  const [currentTenantId, setCurrentTenantId] = useState(
    () => user?.currentTenantId ?? tenants[0]?.id ?? ""
  )
  const [switchingTenant, setSwitchingTenant] = useState(false)

  const { data: tenant } = useSWR<any>(API_CONFIG.ENDPOINTS.TENANT_ME, fetcher)
  const { data: modules } = useSWR<any[]>(API_CONFIG.ENDPOINTS.TENANT_MODULES, fetcher)

  const { data: appointmentsData, mutate: mutateAppointments } = useSWR<any>(
    `${API_CONFIG.ENDPOINTS.APPOINTMENTS}?pageSize=500`,
    fetcher
  )
  const appointments: any[] = appointmentsData?.items ?? (Array.isArray(appointmentsData) ? appointmentsData : [])

  const [period, setPeriod] = useState<"today" | "week">("today")
  const [hasAutoSwitched, setHasAutoSwitched] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [showPastModal, setShowPastModal] = useState(false)
  const hasShownPastModal = useRef(false)

  const pastAppointments = useMemo(() => {
    const now = new Date()
    return (appointments ?? []).filter((a: any) => {
      const date = new Date(a.scheduledDateTime ?? a.date)
      const status = Number(a.status)
      return date < now && (status === 0 || status === 1)
    }).sort((a: any, b: any) => (a.scheduledDateTime ?? a.date ?? "").localeCompare(b.scheduledDateTime ?? b.date ?? ""))
  }, [appointments])

  useEffect(() => {
    if (!hasShownPastModal.current && appointments && pastAppointments.length > 0) {
      hasShownPastModal.current = true
      setShowPastModal(true)
    }
  }, [appointments, pastAppointments.length])

  // Auto-switch to week if today is empty
  useEffect(() => {
    if (!loading && appointments && !hasAutoSwitched) {
      const todayAppts = appointments.filter((a: any) => isToday(a.scheduledDateTime ?? a.date))
      if (todayAppts.length === 0 && period === "today") {
        setPeriod("week")
        setHasAutoSwitched(true)
      }
    }
  }, [loading, appointments, hasAutoSwitched])

  // Sync when user is restored
  useEffect(() => {
    if (user?.currentTenantId) {
      setCurrentTenantId(user.currentTenantId)
    }
  }, [user?.currentTenantId])

  const handleSwitchTenant = useCallback(async (tenantId: string) => {
    setSwitchingTenant(true)
    try {
      await switchTenant(tenantId)
      setCurrentTenantId(tenantId)
      await reloadTheme()
      await mutateAll(() => true, undefined, { revalidate: true })
      refetch()
    } catch {
      Alert.alert("Erro", "Não foi possível trocar de salão. Tente novamente.")
    } finally {
      setSwitchingTenant(false)
    }
  }, [switchTenant, reloadTheme, mutateAll, refetch])

  const isSchedulingEnabled = !modules || modules.find((m: any) => m.module === 2)?.isEnabled !== false
  const bookingUrl = tenant?.slug
    ? `${process.env.EXPO_PUBLIC_WEB_URL}/booking/${tenant.slug}`
    : null

  const [sharingLink, setSharingLink] = useState(false)

  const handleShareBookingLink = useCallback(async () => {
    if (!bookingUrl) return
    setSharingLink(true)
    try {
      await Share.share({
        message: bookingUrl,
        title: "Link de Agendamento",
      })
    } catch {
      // user cancelled
    } finally {
      setSharingLink(false)
    }
  }, [bookingUrl])

  const dashboardAppointments = useMemo(() => {
    const now = new Date()
    return (appointments ?? [])
      .filter((a: any) => {
        // Nunca filtrar o agendamento que está sendo atualizado (para manter o loading visível)
        if (updatingId === a.id) return true

        const dateStr = a.scheduledDateTime ?? a.date
        if (!dateStr) return false

        // Filtro de período (hoje / próximos 7 dias)
        const matchesTime = period === "today" ? isToday(dateStr) : isWithinNext7Days(dateStr)
        if (!matchesTime) return false

        // Agendamentos terminais (Concluído=2, Cancelado=3, Faltou=4) saem após 20 min
        const isFinished = [2, 3, 4].includes(Number(a.status))
        if (isFinished) {
          const minutesSince = (now.getTime() - new Date(dateStr).getTime()) / 60000
          if (minutesSince > 20) return false
        }

        return true
      })
      .sort((a: any, b: any) => {
        const ta = a.scheduledDateTime ?? a.date ?? ""
        const tb = b.scheduledDateTime ?? b.date ?? ""
        return ta.localeCompare(tb)
      })
      .slice(0, 10)
  }, [appointments, period, updatingId])

  const handleStatusChange = useCallback(async (id: string, newStatus: number) => {
    const appointment = appointments?.find((a: any) => a.id === id)
    setUpdatingId(id)
    mutateAppointments(
      (prev: any) => {
        if (!prev) return prev
        if (Array.isArray(prev)) {
          return prev.map((a: any) => a.id === id ? { ...a, status: newStatus } : a)
        }
        if (prev.items) {
          return { ...prev, items: prev.items.map((a: any) => a.id === id ? { ...a, status: newStatus } : a) }
        }
        return prev
      },
      false
    )
    try {
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.APPOINTMENTS}/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify(newStatus),
      })
      if (!res.hasError && appointment && !tenant?.useWhatsappBooking) {
        Alert.alert(
          "Enviar via WhatsApp?",
          "Deseja notificar o cliente sobre a mudança de status pelo WhatsApp?",
          [
            { text: "Não", style: "cancel" },
            { text: "Enviar", onPress: () => sendWhatsAppMessage(appointment, newStatus, false) },
          ]
        )
      }
    } finally {
      setUpdatingId(null)
      mutateAppointments()
    }
  }, [appointments, mutateAppointments, tenant?.useWhatsappBooking, sendWhatsAppMessage])

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
            tintColor={primaryColor}
          />
        }
      >
        {/* ── Header ── */}
        <View
          className="bg-white border-b border-zinc-100 px-5 pb-4"
          style={{ paddingTop: insets.top + 16 }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1 min-w-0 mr-3">
              <Text className="text-zinc-400 text-sm font-semibold">Bem-vindo de volta,</Text>
              <Text className="text-2xl font-black text-zinc-900">{user?.firstName ?? "Usuário"} 👋</Text>
            </View>
            <View className="flex-row items-center gap-2">
              {switchingTenant && (
                <ActivityIndicator size="small" color={primaryColor} />
              )}
              {tenants.length > 0 && (
                <TenantSwitcher
                  tenants={tenants}
                  currentTenantId={currentTenantId}
                  onSwitch={handleSwitchTenant}
                />
              )}
            </View>
          </View>
        </View>

        <View className="px-4 pt-5 gap-4 pb-32">

          {loading && !dashboardData ? (
            <View className="items-center py-16">
              <ActivityIndicator color={primaryColor} size="large" />
            </View>
          ) : (
            <>
              {/* ── 3 Summary Cards ── */}
              <View className="flex-row mt-2 gap-3">
                <SummaryCard
                  label="Receita do mês"
                  value={`R$ ${fmtCurrency(revenue)}`}
                  icon="wallet-outline"
                  color={primaryColor}
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
                  value={maxClients > 0 ? `${totalClients}/${maxClients}` : totalClients}
                  icon="people-outline"
                  color="#d97706"
                  sub="cadastrados"
                />
              </View>

              {/* ── Revenue Chart ── */}
              {revenueByMonth.length > 0 && (
                <View className="bg-white rounded-3xl p-4 mt-2 border border-zinc-100">
                  <Text className="text-base font-black text-zinc-900 mb-1">Receita dos últimos 6 meses</Text>
                  <Text className="text-xs text-zinc-400 font-semibold mb-4">em R$</Text>
                  <RevenueChart data={revenueByMonth} />
                </View>
              )}

              {/* ── Dashboard Appointments ── */}
              <View className="bg-white rounded-3xl p-4 mt-2 border border-zinc-100">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-base font-black text-zinc-900">Agendamentos</Text>
                  <View style={{ flexDirection: "row", backgroundColor: "#f4f4f5", borderRadius: 16, padding: 4, width: 160 }}>
                    {(["today", "week"] as const).map((p) => (
                      <TouchableOpacity
                        key={p}
                        activeOpacity={0.7}
                        onPress={() => setPeriod(p)}
                        style={{
                          flex: 1,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          height: 32,
                          borderRadius: 12,
                          backgroundColor: period === p ? "#ffffff" : "transparent",
                          shadowColor: period === p ? "#000" : "transparent",
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: period === p ? 0.06 : 0,
                          shadowRadius: 2,
                          elevation: period === p ? 1 : 0,
                        }}
                      >
                        <Text style={{ 
                          fontSize: 12, 
                          fontWeight: "700", 
                          color: period === p ? "#18181b" : "#71717a" 
                        }}>
                          {p === "today" ? "Hoje" : "Semana"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {dashboardAppointments.length === 0 ? (
                  <View className="items-center py-8">
                    <Ionicons name="calendar-outline" size={36} color="#d4d4d8" />
                    <Text className="text-zinc-400 font-semibold text-sm mt-2">
                      Nenhum agendamento {period === "today" ? "hoje" : "esta semana"}
                    </Text>
                  </View>
                ) : (
                  dashboardAppointments.map((appt: any) => (
                    <AppointmentCard
                      key={appt.id}
                      appointment={appt}
                      onStatusChange={handleStatusChange}
                      onPress={() => router.push(`${rootPath}/appointments/${appt.id}` as any)}
                      isUpdating={updatingId === appt.id}
                    />
                  ))
                )}

                {/* Banner de agendamentos passados pendentes */}
                {pastAppointments.length > 0 && !showPastModal && (
                  <Pressable
                    onPress={() => setShowPastModal(true)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8, marginBottom: 4, padding: 12, borderRadius: 16, backgroundColor: "#fef3c7", borderWidth: 1, borderColor: "#fde68a" }}
                  >
                    <Ionicons name="time-outline" size={16} color="#d97706" />
                    <Text style={{ flex: 1, fontSize: 13, fontWeight: "700", color: "#92400e" }}>
                      {pastAppointments.length === 1
                        ? "1 agendamento passado pendente"
                        : `${pastAppointments.length} agendamentos passados pendentes`}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color="#d97706" />
                  </Pressable>
                )}

                {/* Ver todos */}
                <Pressable
                  onPress={() => router.push(`${rootPath}/appointments` as any)}
                  className="flex-row items-center justify-center gap-2 mt-3 py-3 rounded-2xl border border-zinc-200 bg-zinc-50 active:bg-zinc-100"
                >
                  <Ionicons name="calendar-outline" size={15} color="#71717a" />
                  <Text className="text-zinc-600 font-bold text-sm">Ver todos os agendamentos</Text>
                  <Ionicons name="chevron-forward" size={14} color="#a1a1aa" />
                </Pressable>
              </View>

              {/* ── Booking Link ── */}
              {hasBooking && isSchedulingEnabled && bookingUrl && (
                <View className="bg-white rounded-3xl p-4 mt-2 border border-zinc-100">
                  <View className="flex-row items-center gap-3 mb-3">
                    <View className="h-9 w-9 rounded-xl items-center justify-center" style={{ backgroundColor: primaryColor + "18" }}>
                      <Ionicons name="link-outline" size={18} color={primaryColor} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-black text-zinc-900">Link de Agendamento</Text>
                      <Text className="text-xs text-zinc-400 font-semibold">Compartilhe com seus clientes</Text>
                    </View>
                  </View>

                  <View className="bg-zinc-50 rounded-2xl px-3 py-2.5 mb-3">
                    <Text className="text-xs text-zinc-500 font-mono" numberOfLines={1} ellipsizeMode="tail">
                      {bookingUrl}
                    </Text>
                  </View>

                  <Pressable
                    onPress={handleShareBookingLink}
                    disabled={sharingLink}
                    className="flex-row items-center justify-center gap-2 rounded-2xl py-3 border"
                    style={{ backgroundColor: primaryColor + "12", borderColor: primaryColor + "30" }}
                  >
                    <Ionicons name="share-social-outline" size={18} color={primaryColor} />
                    <Text className="text-sm font-bold" style={{ color: primaryColor }}>
                      {sharingLink ? "Compartilhando..." : "Compartilhar Link"}
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* ── Top Clients ── */}
              {topClients.length > 0 && (
                <View className="bg-white rounded-3xl p-4 mt-2 border border-zinc-100">
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

      {/* ── Past Appointments Modal ── */}
      <Modal
        visible={showPastModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPastModal(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
          onPress={() => setShowPastModal(false)}
        >
          <Pressable onPress={() => {}} style={{ backgroundColor: "white", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36 }}>
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ height: 36, width: 36, borderRadius: 12, backgroundColor: "#fef3c7", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="time-outline" size={18} color="#d97706" />
                </View>
                <Text style={{ fontSize: 17, fontWeight: "900", color: "#18181b" }}>Agendamentos Passados</Text>
              </View>
              <Pressable
                onPress={() => setShowPastModal(false)}
                style={{ height: 32, width: 32, borderRadius: 16, backgroundColor: "#f4f4f5", alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="close" size={18} color="#71717a" />
              </Pressable>
            </View>
            <Text style={{ color: "#71717a", fontSize: 13, marginBottom: 16 }}>
              {pastAppointments.length === 1
                ? "1 agendamento ainda não foi finalizado. Qual foi o desfecho?"
                : `${pastAppointments.length} agendamentos ainda não foram finalizados. Qual foi o desfecho?`}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
              {pastAppointments.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 32 }}>
                  <Ionicons name="checkmark-circle-outline" size={48} color="#22c55e" />
                  <Text style={{ color: "#71717a", fontSize: 14, marginTop: 8 }}>Tudo atualizado!</Text>
                </View>
              ) : (
                pastAppointments.map((apt: any) => {
                  const currentStatus = getStatus(Number(apt.status))
                  return (
                    <View key={apt.id} style={{ borderWidth: 1, borderColor: "#f4f4f5", borderRadius: 16, padding: 12 }}>
                      {/* Appointment info row */}
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <View style={{ height: 36, width: 36, borderRadius: 12, backgroundColor: "#f4f4f5", alignItems: "center", justifyContent: "center" }}>
                          <Ionicons name="person-outline" size={16} color="#71717a" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: "800", color: "#18181b" }}>{apt.clientName}</Text>
                          {apt.scheduledDateTime || apt.date ? (() => {
                            const d = new Date(apt.scheduledDateTime ?? apt.date)
                            const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
                            const day = DAYS[d.getDay()]
                            const dateStr = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`
                            const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
                            return (
                              <Text style={{ fontSize: 12, color: "#d97706", fontWeight: "700" }}>
                                {day}, {dateStr} às {timeStr}
                              </Text>
                            )
                          })() : null}
                          {apt.serviceName ? (
                            <Text style={{ fontSize: 12, color: "#71717a" }}>{apt.serviceName}</Text>
                          ) : null}
                        </View>
                        <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: currentStatus.bg, borderWidth: 1, borderColor: currentStatus.border }}>
                          <Text style={{ fontSize: 11, fontWeight: "700", color: currentStatus.text }}>{currentStatus.label}</Text>
                        </View>
                      </View>

                      {/* Status action buttons: only terminal statuses */}
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        {STATUS_OPTIONS.filter(s => [2, 3, 4].includes(s.value)).map((opt) => {
                          const isLoading = updatingId === apt.id
                          return (
                            <Pressable
                              key={opt.value}
                              onPress={() => !isLoading && handleStatusChange(apt.id, opt.value)}
                              disabled={isLoading}
                              style={{ flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: "center", backgroundColor: opt.bg, borderWidth: 1, borderColor: opt.border, opacity: isLoading ? 0.6 : 1 }}
                            >
                              {isLoading ? (
                                <ActivityIndicator size="small" color={opt.text} />
                              ) : (
                                <Text style={{ fontSize: 12, fontWeight: "700", color: opt.text }}>{opt.label}</Text>
                              )}
                            </Pressable>
                          )
                        })}
                      </View>
                    </View>
                  )
                })
              )}
            </ScrollView>

            <Pressable
              onPress={() => setShowPastModal(false)}
              style={{ marginTop: 12, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#f4f4f5" }}
            >
              <Text style={{ color: "#52525b", fontWeight: "700" }}>Fechar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}
