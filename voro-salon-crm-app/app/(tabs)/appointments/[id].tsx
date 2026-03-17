import React from "react"
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter, useLocalSearchParams } from "expo-router"
import { useAppointmentDetail } from "hooks/use-appointment-detail.hook"

export default function AppointmentDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { appointment, isLoading } = useAppointmentDetail(id)

  if (isLoading) {
    return <SafeAreaView className="flex-1 bg-zinc-50 items-center justify-center"><ActivityIndicator color="#7c3aed" size="large" /></SafeAreaView>
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <View className="bg-white px-5 pt-4 pb-4 border-b border-zinc-100 flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} className="h-9 w-9 bg-zinc-50 rounded-xl items-center justify-center border border-zinc-100">
          <Ionicons name="chevron-back" size={20} color="#18181b" />
        </Pressable>
        <Text className="text-xl font-black text-zinc-900">Agendamento</Text>
      </View>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {appointment && (
          <View className="bg-white rounded-3xl p-5 border border-zinc-100 gap-4">
            {[
              { icon: "person-outline", label: "Cliente", value: (appointment as any).clientName ?? `${(appointment as any).client?.firstName ?? ""} ${(appointment as any).client?.lastName ?? ""}`.trim() },
              { icon: "cut-outline", label: "Serviço", value: (appointment as any).serviceName ?? (appointment as any).service?.name },
              { icon: "calendar-outline", label: "Data", value: (appointment as any).date },
              { icon: "time-outline", label: "Horário", value: (appointment as any).startTime },
              { icon: "flag-outline", label: "Status", value: (appointment as any).status },
            ].filter(f => f.value).map((field) => (
              <View key={field.label} className="flex-row items-center gap-3">
                <View className="h-9 w-9 bg-purple-50 rounded-xl items-center justify-center">
                  <Ionicons name={field.icon as any} size={18} color="#7c3aed" />
                </View>
                <View>
                  <Text className="text-zinc-400 text-xs font-semibold">{field.label}</Text>
                  <Text className="text-zinc-900 font-bold">{field.value}</Text>
                </View>
              </View>
            ))}
            {(appointment as any).notes && (
              <View>
                <Text className="text-zinc-400 text-xs font-semibold mb-1">Observações</Text>
                <Text className="text-zinc-700">{(appointment as any).notes}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
