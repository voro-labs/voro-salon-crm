import React from "react"
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useDataList } from "hooks/use-data-list.hook"
import { API_CONFIG } from "lib/api"
import { ScreenHeader } from "components/ScreenHeader"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { useModuleGuard } from "hooks/use-module-guard.hook"
import { useAuth } from "contexts/auth.context"

interface Appointment {
  id: string
  clientName?: string
  serviceName?: string
  description?: string
  scheduledDateTime?: string
  date?: string
  startTime?: string
  durationMinutes?: number
  status?: string | number
  client?: { firstName?: string; lastName?: string; name?: string }
  service?: { name: string }
}

const STATUS_MAP: Record<string | number, { label: string; bg: string; text: string; border: string }> = {
  0:           { label: "Pendente",   bg: "#fef9c3", text: "#854d0e", border: "#fef08a" },
  1:           { label: "Confirmado", bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  2:           { label: "Concluído",  bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" },
  3:           { label: "Cancelado",  bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
  4:           { label: "Faltou",     bg: "#f4f4f5", text: "#52525b", border: "#e4e4e7" },
  Scheduled:   { label: "Agendado",   bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  Confirmed:   { label: "Confirmado", bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  Completed:   { label: "Concluído",  bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" },
  Cancelled:   { label: "Cancelado",  bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
  NoShow:      { label: "Faltou",     bg: "#f4f4f5", text: "#52525b", border: "#e4e4e7" },
}

const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

function parseDateInfo(item: Appointment): { day: string; month: string; time: string } | null {
  if (item.scheduledDateTime) {
    const d = new Date(item.scheduledDateTime)
    if (isNaN(d.getTime())) return null
    return {
      day: String(d.getDate()).padStart(2, "0"),
      month: MONTHS_SHORT[d.getMonth()],
      time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
    }
  }
  if (item.date) {
    const [y, m, d] = item.date.split("-").map(Number)
    if (!y || !m || !d) return null
    return {
      day: String(d).padStart(2, "0"),
      month: MONTHS_SHORT[m - 1] ?? "",
      time: item.startTime ?? "",
    }
  }
  return null
}

function AppointmentCard({ item, onPress, primaryColor }: { item: Appointment; onPress: () => void; primaryColor: string }) {
  const status = STATUS_MAP[item.status ?? 1] ?? STATUS_MAP[1]
  const clientName = (
    item.clientName ??
    item.client?.name ??
    `${item.client?.firstName ?? ""} ${item.client?.lastName ?? ""}`.trim()
  ) || "Cliente"
  const serviceName = item.serviceName ?? item.service?.name ?? item.description ?? ""
  const dateInfo = parseDateInfo(item)
  const initials = clientName[0]?.toUpperCase() ?? "?"

  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl mb-2 border border-zinc-100 active:bg-zinc-50 flex-row overflow-hidden"
    >
      {/* Date block */}
      {dateInfo ? (
        <View className="w-16 items-center justify-center py-4 px-4 shrink-0" style={{ backgroundColor: primaryColor + "15" }}>
          <Text className="text-2xl font-black leading-tight" style={{ color: primaryColor }}>{dateInfo.day}</Text>
          <Text className="text-xs font-bold uppercase tracking-wide" style={{ color: primaryColor + "99" }}>{dateInfo.month}</Text>
        </View>
      ) : (
        <View className="w-16 bg-zinc-50 items-center justify-center py-4 shrink-0">
          <Ionicons name="calendar-outline" size={22} color="#a1a1aa" />
        </View>
      )}

      {/* Main content */}
      <View className="flex-1 px-3 py-3 min-w-0">
        {/* Client name + status */}
        <View className="flex-row items-center gap-2 mb-1">
          <View className="h-6 w-6 rounded-lg items-center justify-center shrink-0" style={{ backgroundColor: primaryColor + "25" }}>
            <Text className="font-black text-xs" style={{ color: primaryColor }}>{initials}</Text>
          </View>
          <Text className="flex-1 text-zinc-900 font-bold text-sm" numberOfLines={1}>{clientName}</Text>
          <View
            className="px-4 py-0.5 rounded-2xl border shrink-0"
            style={{ backgroundColor: status.bg, borderColor: status.border }}
          >
            <Text className="text-xs font-bold" style={{ color: status.text }}>{status.label}</Text>
          </View>
        </View>

        {/* Service name */}
        {serviceName ? (
          <Text className="text-zinc-500 text-xs mb-2" numberOfLines={1}>{serviceName}</Text>
        ) : null}

        {/* Time + Duration */}
        <View className="flex-row items-center gap-3">
          {dateInfo?.time ? (
            <View className="flex-row items-center gap-1">
              <Ionicons name="time-outline" size={12} color="#a1a1aa" />
              <Text className="text-zinc-500 text-xs font-semibold">{dateInfo.time}</Text>
            </View>
          ) : null}
          {item.durationMinutes ? (
            <View className="flex-row items-center gap-1">
              <Ionicons name="hourglass-outline" size={12} color="#a1a1aa" />
              <Text className="text-zinc-500 text-xs font-semibold">{item.durationMinutes} min</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Chevron */}
      <View className="items-center justify-center pr-3 shrink-0">
        <Ionicons name="chevron-forward" size={16} color="#d4d4d8" />
      </View>
    </Pressable>
  )
}

export function AppointmentsScreen({ rootPath = "/(tabs)" }: { rootPath?: string }) {
  useModuleGuard("appointments")
  const router = useRouter()
  const { primaryColor } = useTenantTheme()
  const { user } = useAuth()
  const isSalonEmployee = user?.roles?.some((r: any) => r.name === "SalonEmployee") ?? false

  const { items, isLoading, isLoadingMore, search, setSearch, loadMore, refresh } =
    useDataList<Appointment>(API_CONFIG.ENDPOINTS.APPOINTMENTS)

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={[]}>
      <ScreenHeader title="Agendamentos" />

      <View className="bg-white px-5 pt-3 pb-4 border-b border-zinc-100 flex-col gap-3">
        <View className="flex-row items-center gap-3">
          <View className="flex-1 bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-2 flex-row items-center gap-2">
            <Ionicons name="search" size={18} color="#a1a1aa" />
            <TextInput
              className="flex-1 text-zinc-900 font-medium text-sm py-1 h-8"
              placeholder="Buscar agendamentos..."
              placeholderTextColor="#a1a1aa"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={18} color="#a1a1aa" />
              </Pressable>
            )}
          </View>
          <Pressable
            onPress={() => router.push(`${rootPath}/appointments/new` as any)}
            className="h-11 w-11 rounded-2xl items-center justify-center shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            <Ionicons name="add" size={24} color="white" />
          </Pressable>
        </View>

        {!isSalonEmployee && (
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => router.push(`${rootPath}/appointments/blocked` as any)}
              className="flex-1 flex-row items-center justify-center gap-1.5 h-10 rounded-xl bg-red-50 border border-red-100"
            >
              <Ionicons name="lock-closed" size={14} color="#ef4444" />
              <Text className="text-red-700 font-bold text-sm">Horários Bloqueados</Text>
            </Pressable>
          </View>
        )}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={primaryColor} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AppointmentCard
              item={item}
              primaryColor={primaryColor}
              onPress={() => router.push(`${rootPath}/appointments/${item.id}` as any)}
            />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={isLoading && items.length > 0}
              onRefresh={refresh}
            />
          }
          ListFooterComponent={() =>
            isLoadingMore ? (
              <View style={{ paddingVertical: 16, alignItems: "center" }}>
                <ActivityIndicator size="small" color={primaryColor} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="items-center py-16">
              <Ionicons name="calendar-outline" size={48} color="#d4d4d8" />
              <Text className="text-zinc-400 font-semibold mt-3 text-base">
                {search ? "Nenhum resultado encontrado" : "Nenhum agendamento"}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}
