import React, { useState, useMemo, useEffect, useCallback } from "react"
import {
  View, Text, ScrollView, RefreshControl, Pressable,
  ActivityIndicator, Modal, Alert, Share, TouchableOpacity,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useSafeAreaInsets } from "react-native-safe-area-context"
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

function fmtCurrency(value: number) {
  return (value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function abbreviate(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return (value || 0).toFixed(0)
}

function formatTime(iso?: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

const TODAY_STR = new Date().toLocaleDateString("en-CA") // YYYY-MM-DD em local time

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

// ─── Today Appointment Card ───────────────────────────────────────────────────

function AppointmentCard({
  appointment,
  onStatusChange,
}: {
  appointment: any
  onStatusChange: (id: string, status: number) => void
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const { primaryColor } = useTenantTheme()
  const status = useMemo(() => getStatus(appointment.status ?? 0), [appointment.status])
  const clientName = (appointment.clientName ?? `${appointment.client?.firstName ?? ""} ${appointment.client?.lastName ?? ""}`.trim()) || "Cliente"
  const serviceName = appointment.serviceName ?? appointment.service?.name ?? appointment.description ?? "Serviço"

  return (
    <>
      <View className="flex-row items-center gap-3 py-3 border-b border-zinc-50 last:border-0">
        <View className="h-10 w-10 rounded-2xl items-center justify-center shrink-0" style={{ backgroundColor: primaryColor + "15" }}>
          <Text className="font-black text-sm" style={{ color: primaryColor }}>{clientName[0]?.toUpperCase()}</Text>
        </View>

        <View className="flex-1 min-w-0">
          <Text className="text-zinc-900 font-bold text-sm" numberOfLines={1}>{clientName}</Text>
          <Text className="text-zinc-400 text-xs" numberOfLines={1}>{serviceName}</Text>
        </View>

        <View className="items-end gap-2 shrink-0">
          {appointment.scheduledDateTime ? (
            <Text className="text-zinc-500 text-xs font-semibold">{formatTime(appointment.scheduledDateTime)}</Text>
          ) : null}
          <Pressable
            onPress={() => setModalOpen(true)}
            className="rounded-2xl px-2.5 py-1 border"
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

// ─── Dashboard Screen ─────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const insets = useSafeAreaInsets()
  const { user, logout, switchTenant } = useAuth()
  const { dashboardData, loading, refetch } = useDashboard()
  const { maxClients } = usePlanLimits()
  const { mutate: mutateAll } = useSWRConfig()
  const { sendWhatsAppMessage } = useWhatsApp()
  const router = useRouter() // Re-adding useRouter hook as it's required for navigation context tracking in some versions of expo-router

  const { primaryColor, reload: reloadTheme } = useTenantTheme()

  const tenants = user?.tenants ?? []
  const [currentTenantId, setCurrentTenantId] = useState(
    () => user?.currentTenantId ?? tenants[0]?.id ?? ""
  )
  const [switchingTenant, setSwitchingTenant] = useState(false)

  const { data: tenant } = useSWR<any>(API_CONFIG.ENDPOINTS.TENANT_ME, fetcher)
  const { data: modules } = useSWR<any[]>(API_CONFIG.ENDPOINTS.TENANT_MODULES, fetcher)

  const { data: appointments, mutate: mutateAppointments } = useSWR<any[]>(
    API_CONFIG.ENDPOINTS.APPOINTMENTS,
    fetcher
  )

  const [period, setPeriod] = useState<"today" | "week">("today")
  const [hasAutoSwitched, setHasAutoSwitched] = useState(false)

  // Auto-switch to week if today is empty (only once per app load or tenant change)
  useEffect(() => {
    if (!loading && appointments && !hasAutoSwitched) {
      const todayAppts = appointments.filter((a: any) => isToday(a.scheduledDateTime ?? a.date))
      if (todayAppts.length === 0 && period === "today") {
        setPeriod("week")
        setHasAutoSwitched(true)
      }
    }
  }, [loading, appointments, hasAutoSwitched])

  // Sincroniza quando o user é restaurado do token (ex: app reaberto)
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
      // Invalida todos os caches do SWR para forçar refetch em todas as abas
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
      // user cancelled share
    } finally {
      setSharingLink(false)
    }
  }, [bookingUrl])

  const dashboardAppointments = useMemo(() => {
    return (appointments ?? [])
      .filter((a: any) => {
        const date = a.scheduledDateTime ?? a.date
        return period === "today" ? isToday(date) : isWithinNext7Days(date)
      })
      .sort((a: any, b: any) => {
        const ta = a.scheduledDateTime ?? a.date ?? ""
        const tb = b.scheduledDateTime ?? b.date ?? ""
        return ta.localeCompare(tb)
      })
      .slice(0, 5)
  }, [appointments, period])

  const handleStatusChange = useCallback(async (id: string, newStatus: number) => {
    const appointment = appointments?.find((a) => a.id === id)
    mutateAppointments(
      (prev) => prev?.map((a) => a.id === id ? { ...a, status: newStatus } : a),
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
                    />
                  ))
                )}
              </View>

              {/* ── Booking Link ── */}
              {isSchedulingEnabled && bookingUrl && (
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
    </SafeAreaView>
  )
}
