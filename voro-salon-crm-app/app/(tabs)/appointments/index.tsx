import React from "react"
import { View, Text, TextInput, FlatList, Pressable, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useDataList } from "hooks/use-data-list.hook"
import { API_CONFIG } from "lib/api"
import { ScreenHeader } from "components/ScreenHeader"

interface Appointment {
  id: string
  clientName?: string
  serviceName?: string
  date?: string
  startTime?: string
  status?: string
  client?: { firstName: string; lastName: string }
  service?: { name: string }
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  Scheduled: { label: "Agendado", bg: "bg-blue-50", text: "text-blue-600" },
  Completed: { label: "Concluído", bg: "bg-green-50", text: "text-green-600" },
  Cancelled: { label: "Cancelado", bg: "bg-red-50", text: "text-red-600" },
  NoShow: { label: "Faltou", bg: "bg-yellow-50", text: "text-yellow-600" },
}

export default function AppointmentsScreen() {
  const router = useRouter()
  const { filteredData, isLoading, search, setSearch } = useDataList<Appointment>(
    API_CONFIG.ENDPOINTS.APPOINTMENTS,
    (a, q) => `${a.clientName ?? ""} ${a.client?.firstName ?? ""} ${a.serviceName ?? ""} ${a.service?.name ?? ""}`.toLowerCase().includes(q)
  )

  const renderItem = ({ item }: { item: Appointment }) => {
    const status = STATUS_CONFIG[item.status ?? ""] ?? STATUS_CONFIG.Scheduled
    const clientName = item.clientName ?? `${item.client?.firstName ?? ""} ${item.client?.lastName ?? ""}`.trim()
    const serviceName = item.serviceName ?? item.service?.name ?? "Serviço"

    return (
      <Pressable onPress={() => router.push(`/(tabs)/appointments/${item.id}` as any)} className="bg-white rounded-2xl p-4 mb-2 border border-zinc-100 active:bg-zinc-50">
        <View className="flex-row items-start justify-between mb-1">
          <Text className="text-zinc-900 font-bold text-base flex-1">{clientName}</Text>
          <View className={`px-2.5 py-0.5 rounded-full ${status.bg}`}>
            <Text className={`text-xs font-bold ${status.text}`}>{status.label}</Text>
          </View>
        </View>
        <Text className="text-zinc-500 text-sm">{serviceName}</Text>
        {(item.date || item.startTime) && (
          <View className="flex-row items-center gap-1 mt-1">
            <Ionicons name="time-outline" size={13} color="#a1a1aa" />
            <Text className="text-zinc-400 text-xs">{item.date} {item.startTime}</Text>
          </View>
        )}
      </Pressable>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={[]}>
      <ScreenHeader title="Agendamentos" />
      <View className="bg-white px-5 pt-3 pb-4 border-b border-zinc-100">
        <View className="bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-2 flex-row items-center gap-2">
          <Ionicons name="search" size={18} color="#a1a1aa" />
          <TextInput className="flex-1 text-zinc-900 font-medium text-sm py-1" placeholder="Buscar agendamentos..." placeholderTextColor="#a1a1aa" value={search} onChangeText={setSearch} />
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#7c3aed" /></View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Ionicons name="calendar-outline" size={48} color="#d4d4d8" />
              <Text className="text-zinc-400 font-semibold mt-3">Nenhum agendamento</Text>
            </View>
          }
        />
      )}

      <Pressable onPress={() => router.push("/(tabs)/appointments/new" as any)} className="absolute bottom-24 right-5 h-14 w-14 bg-purple-600 rounded-2xl items-center justify-center shadow-lg shadow-purple-200">
        <Ionicons name="add" size={28} color="white" />
      </Pressable>
    </SafeAreaView>
  )
}
