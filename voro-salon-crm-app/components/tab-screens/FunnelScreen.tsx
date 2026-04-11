import React, { useState } from "react"
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  RefreshControl,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import useSWR from "swr"
import { API_CONFIG } from "lib/api"
import { fetcher } from "lib/fetcher"
import { ScreenHeader } from "components/ScreenHeader"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { useModuleGuard } from "hooks/use-module-guard.hook"

interface FunnelItem {
  id: string
  clientName: string
  clientPhone?: string
  serviceName?: string
  scheduledDateTime?: string
  durationMinutes?: number
  status?: number
  amount?: number
  source: number
  employeeName?: string
  funnelState: string
  sessionId?: string
}

const KANBAN_COLUMNS: { state: string; label: string; color: string; bg: string }[] = [
  { state: "START",                  label: "Novo Contato",          color: "#94a3b8", bg: "#f8fafc" },
  { state: "AWAITING_TENANT",        label: "Escolhendo Unidade",    color: "#71717a", bg: "#fafafa" },
  { state: "AWAITING_SERVICE",       label: "Escolhendo Serviço",    color: "#3b82f6", bg: "#eff6ff" },
  { state: "AWAITING_EMPLOYEE",      label: "Escolhendo Profissional",color: "#8b5cf6", bg: "#f5f3ff" },
  { state: "AWAITING_DATE",          label: "Escolhendo Data",       color: "#f59e0b", bg: "#fffbeb" },
  { state: "AWAITING_TIME",          label: "Escolhendo Horário",    color: "#f97316", bg: "#fff7ed" },
  { state: "AWAITING_DESCRIPTION",   label: "Aguardando Descrição",  color: "#a855f7", bg: "#faf5ff" },
  { state: "AWAITING_CONFIRMATION",  label: "Aguardando Confirmação",color: "#f43f5e", bg: "#fff1f2" },
  { state: "AWAITING_REMINDER_TIME", label: "Definindo Lembrete",    color: "#6366f1", bg: "#eef2ff" },
  { state: "COMPLETED",              label: "Agendado",              color: "#10b981", bg: "#f0fdf4" },
  { state: "CANCELLED",              label: "Cancelado",             color: "#9ca3af", bg: "#f9fafb" },
]

const SOURCE_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: "Bot",  color: "#16a34a", bg: "#f0fdf4" },
  2: { label: "App",  color: "#2563eb", bg: "#eff6ff" },
  3: { label: "Site", color: "#7c3aed", bg: "#f5f3ff" },
}

const MONTHS_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]

function formatDateTime(dt?: string): string {
  if (!dt) return "Em andamento..."
  const d = new Date(dt)
  if (isNaN(d.getTime())) return "Em andamento..."
  return `${String(d.getDate()).padStart(2,"0")} ${MONTHS_SHORT[d.getMonth()]} · ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`
}

function FunnelCard({ item, primaryColor, onPress }: { item: FunnelItem; primaryColor: string; onPress?: () => void }) {
  const src = SOURCE_CONFIG[item.source] ?? SOURCE_CONFIG[3]
  const isSession = !!item.sessionId

  return (
    <Pressable
      onPress={onPress}
      disabled={isSession}
      className="bg-white rounded-2xl p-3 mb-2 border border-zinc-100 active:bg-zinc-50"
      style={{ opacity: isSession ? 1 : 1 }}
    >
      <View className="flex-row items-start justify-between gap-2 mb-1">
        <Text className="text-zinc-900 font-bold text-sm flex-1" numberOfLines={1}>
          {item.clientName}
        </Text>
        <View className="rounded-lg px-2 py-0.5 shrink-0" style={{ backgroundColor: src.bg }}>
          <Text className="text-[10px] font-bold" style={{ color: src.color }}>{src.label}</Text>
        </View>
      </View>

      {item.serviceName ? (
        <Text className="text-zinc-500 text-xs mb-1" numberOfLines={1}>{item.serviceName}</Text>
      ) : null}

      <View className="flex-row items-center gap-1">
        <Ionicons name="time-outline" size={11} color="#a1a1aa" />
        <Text className="text-zinc-400 text-[11px]">{formatDateTime(item.scheduledDateTime)}</Text>
      </View>

      {item.employeeName ? (
        <View className="flex-row items-center gap-1 mt-0.5">
          <Ionicons name="person-outline" size={11} color="#a1a1aa" />
          <Text className="text-zinc-400 text-[11px]" numberOfLines={1}>{item.employeeName}</Text>
        </View>
      ) : null}
    </Pressable>
  )
}

function LegendModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}>
          <View className="bg-white rounded-3xl p-5 max-h-[80%]">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-zinc-900 font-black text-base">Legenda</Text>
              <Pressable onPress={onClose} className="h-8 w-8 rounded-full bg-zinc-100 items-center justify-center">
                <Ionicons name="close" size={16} color="#52525b" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Etapas do funil</Text>
              {KANBAN_COLUMNS.map((col) => (
                <View key={col.state} className="flex-row items-center gap-2 mb-2">
                  <View className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                  <Text className="text-zinc-700 text-xs font-semibold">{col.label}</Text>
                </View>
              ))}

              <Text className="text-zinc-500 text-xs font-bold uppercase tracking-wider mt-4 mb-2">Canais de origem</Text>
              {Object.entries(SOURCE_CONFIG).map(([k, v]) => (
                <View key={k} className="flex-row items-center gap-2 mb-2">
                  <View className="rounded-lg px-2 py-0.5" style={{ backgroundColor: v.bg }}>
                    <Text className="text-[10px] font-bold" style={{ color: v.color }}>{v.label}</Text>
                  </View>
                  <Text className="text-zinc-600 text-xs">
                    {k === "1" ? "WhatsApp Bot" : k === "2" ? "Aplicativo" : "Site de agendamento"}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

export function FunnelScreen() {
  useModuleGuard("whatsapp")
  const router = useRouter()
  const { primaryColor } = useTenantTheme()

  const [showAll, setShowAll] = useState(false)
  const [showLegend, setShowLegend] = useState(false)

  const { data: items, isLoading, mutate } = useSWR<FunnelItem[]>(
    `${API_CONFIG.ENDPOINTS.FUNNEL_APPOINTMENTS}?days=30`,
    fetcher,
    { refreshInterval: 60000 }
  )

  const grouped = KANBAN_COLUMNS.reduce<Record<string, FunnelItem[]>>((acc, col) => {
    acc[col.state] = (items ?? []).filter((i) => i.funnelState === col.state)
    return acc
  }, {})

  const visibleColumns = showAll
    ? KANBAN_COLUMNS
    : KANBAN_COLUMNS.filter((col) => grouped[col.state].length > 0)

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={[]}>
      <ScreenHeader
        title="Funil"
        right={
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => setShowAll((v) => !v)}
              className="h-9 px-3 rounded-xl items-center justify-center flex-row gap-1.5 border"
              style={{
                backgroundColor: showAll ? primaryColor + "15" : "#f4f4f5",
                borderColor: showAll ? primaryColor + "40" : "#e4e4e7",
              }}
            >
              <Text className="text-xs font-bold" style={{ color: showAll ? primaryColor : "#52525b" }}>
                {showAll ? "Todas" : "Com itens"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setShowLegend(true)}
              className="h-9 w-9 rounded-xl bg-zinc-100 items-center justify-center border border-zinc-200"
            >
              <Ionicons name="information-circle-outline" size={18} color="#52525b" />
            </Pressable>
            <Pressable
              onPress={() => mutate()}
              className="h-9 w-9 rounded-xl bg-zinc-100 items-center justify-center border border-zinc-200"
            >
              <Ionicons name="refresh-outline" size={18} color="#52525b" />
            </Pressable>
          </View>
        }
      />

      <LegendModal visible={showLegend} onClose={() => setShowLegend(false)} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={primaryColor} />
          <Text className="text-zinc-400 text-sm mt-3">Carregando funil...</Text>
        </View>
      ) : visibleColumns.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="funnel-outline" size={48} color="#d4d4d8" />
          <Text className="text-zinc-400 font-semibold mt-3 text-base text-center">
            Nenhum agendamento no funil
          </Text>
          <Pressable onPress={() => setShowAll(true)} className="mt-4">
            <Text className="text-sm font-bold" style={{ color: primaryColor }}>Ver todas as colunas</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ padding: 12, gap: 10, flexDirection: "row", alignItems: "flex-start" }}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={() => mutate()} />
          }
        >
          {visibleColumns.map((col) => {
            const colItems = grouped[col.state]
            return (
              <View
                key={col.state}
                style={{ width: 210, backgroundColor: col.bg, borderRadius: 20, padding: 12, borderWidth: 1, borderColor: col.color + "30" }}
              >
                {/* Column header */}
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-2 flex-1 min-w-0">
                    <View className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                    <Text className="text-zinc-800 font-bold text-xs flex-1" numberOfLines={1}>
                      {col.label}
                    </Text>
                  </View>
                  <View className="rounded-full px-2 py-0.5 ml-1" style={{ backgroundColor: col.color + "20" }}>
                    <Text className="text-[11px] font-black" style={{ color: col.color }}>
                      {colItems.length}
                    </Text>
                  </View>
                </View>

                {/* Cards */}
                {colItems.length === 0 ? (
                  <View className="py-6 items-center">
                    <Text className="text-zinc-300 text-xs font-medium">Nenhum</Text>
                  </View>
                ) : (
                  colItems.map((item) => (
                    <FunnelCard
                      key={item.id}
                      item={item}
                      primaryColor={primaryColor}
                      onPress={item.sessionId ? undefined : () => router.push(`/(premium-tabs)/appointments/${item.id}` as any)}
                    />
                  ))
                )}
              </View>
            )
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
