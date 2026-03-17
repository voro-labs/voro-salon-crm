import React from "react"
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter, useLocalSearchParams } from "expo-router"
import { useServiceDetail } from "hooks/use-service-detail.hook"

function fmtCurrency(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function StatCard({
  icon, label, value, color,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"]
  label: string
  value: string
  color: string
}) {
  return (
    <View className="flex-1 bg-white rounded-2xl p-4 border border-zinc-100 items-center gap-2">
      <View className="h-10 w-10 rounded-2xl items-center justify-center" style={{ backgroundColor: color + "18" }}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text className="text-xl font-black text-zinc-900">{value}</Text>
      <Text className="text-xs font-semibold text-zinc-400 text-center">{label}</Text>
    </View>
  )
}

export default function ServiceDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { service, isLoading, isDeleting, deleteService } = useServiceDetail(id)

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-50 items-center justify-center">
        <ActivityIndicator color="#7c3aed" size="large" />
      </SafeAreaView>
    )
  }

  if (!service) return null

  const svc = service as any

  function confirmDelete() {
    Alert.alert(
      "Excluir serviço?",
      `"${svc.name}" será removido permanentemente.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: () => deleteService() },
      ]
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      {/* Header */}
      <View className="bg-white px-5 pt-4 pb-4 border-b border-zinc-100 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          className="h-9 w-9 bg-zinc-50 rounded-xl items-center justify-center border border-zinc-100"
        >
          <Ionicons name="chevron-back" size={20} color="#18181b" />
        </Pressable>
        <Text className="flex-1 text-xl font-black text-zinc-900">Serviço</Text>

        <Pressable
          onPress={() => router.push(`/(tabs)/services/edit?id=${id}` as any)}
          className="h-9 w-9 bg-purple-50 rounded-xl items-center justify-center border border-purple-100"
        >
          <Ionicons name="create-outline" size={18} color="#7c3aed" />
        </Pressable>
        <Pressable
          onPress={confirmDelete}
          disabled={isDeleting}
          className="h-9 w-9 bg-red-50 rounded-xl items-center justify-center border border-red-100"
        >
          {isDeleting
            ? <ActivityIndicator size="small" color="#dc2626" />
            : <Ionicons name="trash-outline" size={18} color="#dc2626" />
          }
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity card */}
        <View className="bg-white rounded-3xl p-6 border border-zinc-100 items-center">
          <View className="h-20 w-20 bg-purple-50 rounded-3xl items-center justify-center mb-4">
            <Ionicons name="cut-outline" size={36} color="#7c3aed" />
          </View>
          <Text className="text-2xl font-black text-zinc-900 text-center">{svc.name}</Text>
          {svc.description ? (
            <Text className="text-zinc-500 text-sm text-center mt-2 leading-relaxed">{svc.description}</Text>
          ) : null}
        </View>

        {/* Stats row */}
        <View className="flex-row gap-3">
          {(svc.durationMinutes ?? svc.duration) ? (
            <StatCard
              icon="hourglass-outline"
              label="Duração"
              value={`${svc.durationMinutes ?? svc.duration} min`}
              color="#7c3aed"
            />
          ) : null}
          {svc.price != null && svc.price > 0 ? (
            <StatCard
              icon="wallet-outline"
              label="Preço"
              value={fmtCurrency(svc.price)}
              color="#059669"
            />
          ) : null}
        </View>

        {/* Edit button */}
        <Pressable
          onPress={() => router.push(`/(tabs)/services/edit?id=${id}` as any)}
          className="h-14 bg-purple-600 rounded-2xl items-center justify-center flex-row gap-2 mt-2"
        >
          <Ionicons name="create-outline" size={20} color="white" />
          <Text className="text-white font-black text-base">Editar Serviço</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
