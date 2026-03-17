import React from "react"
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter, useLocalSearchParams } from "expo-router"
import { useServiceDetail } from "hooks/use-service-detail.hook"

export default function ServiceDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { service, isLoading } = useServiceDetail(id)

  if (isLoading) {
    return <SafeAreaView className="flex-1 bg-zinc-50 items-center justify-center"><ActivityIndicator color="#7c3aed" size="large" /></SafeAreaView>
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <View className="bg-white px-5 pt-4 pb-4 border-b border-zinc-100 flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} className="h-9 w-9 bg-zinc-50 rounded-xl items-center justify-center border border-zinc-100">
          <Ionicons name="chevron-back" size={20} color="#18181b" />
        </Pressable>
        <Text className="text-xl font-black text-zinc-900">Serviço</Text>
      </View>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {service && (
          <View className="bg-white rounded-3xl p-5 border border-zinc-100 gap-4">
            <View className="items-center mb-2">
              <View className="h-16 w-16 bg-purple-50 rounded-3xl items-center justify-center mb-3">
                <Ionicons name="cut-outline" size={32} color="#7c3aed" />
              </View>
              <Text className="text-2xl font-black text-zinc-900">{(service as any).name}</Text>
            </View>
            {(service as any).description && <Text className="text-zinc-600 text-center">{(service as any).description}</Text>}
            <View className="flex-row justify-center gap-6 mt-2">
              {(service as any).duration && (
                <View className="items-center">
                  <Text className="text-2xl font-black text-purple-600">{(service as any).duration}</Text>
                  <Text className="text-zinc-500 text-xs">minutos</Text>
                </View>
              )}
              {(service as any).price != null && (
                <View className="items-center">
                  <Text className="text-2xl font-black text-green-600">R$ {(service as any).price?.toFixed(2)}</Text>
                  <Text className="text-zinc-500 text-xs">preço</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
