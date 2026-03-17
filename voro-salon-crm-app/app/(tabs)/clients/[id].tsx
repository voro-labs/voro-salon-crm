import React from "react"
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter, useLocalSearchParams } from "expo-router"
import { useClientDetails } from "hooks/use-client-details.hook"

export default function ClientDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { client, services, isLoading } = useClientDetails(id)

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-50 items-center justify-center">
        <ActivityIndicator color="#7c3aed" size="large" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <View className="bg-white px-5 pt-4 pb-4 border-b border-zinc-100 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} className="h-9 w-9 bg-zinc-50 rounded-xl items-center justify-center border border-zinc-100">
            <Ionicons name="chevron-back" size={20} color="#18181b" />
          </Pressable>
          <Text className="text-xl font-black text-zinc-900">Detalhes do Cliente</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => {}} tintColor="#7c3aed" />}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        {client && (
          <>
            {/* Profile Card */}
            <View className="bg-white rounded-3xl p-5 border border-zinc-100 mb-4">
              <View className="items-center mb-4">
                <View className="h-20 w-20 bg-purple-100 rounded-3xl items-center justify-center mb-3">
                  <Text className="text-purple-700 font-black text-2xl">
                    {`${(client as any).firstName?.[0] ?? ""}${(client as any).lastName?.[0] ?? ""}`.toUpperCase()}
                  </Text>
                </View>
                <Text className="text-xl font-black text-zinc-900">{(client as any).firstName} {(client as any).lastName}</Text>
              </View>
              <View className="gap-2">
                {(client as any).email && (
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="mail-outline" size={16} color="#71717a" />
                    <Text className="text-zinc-600 text-sm">{(client as any).email}</Text>
                  </View>
                )}
                {(client as any).phone && (
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="call-outline" size={16} color="#71717a" />
                    <Text className="text-zinc-600 text-sm">{(client as any).phone}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Service History */}
            {services && services.length > 0 && (
              <View>
                <Text className="text-base font-black text-zinc-900 mb-3">Serviços Contratados</Text>
                {services.map((item: any, i: number) => (
                  <View key={i} className="bg-white rounded-2xl p-4 mb-2 border border-zinc-100">
                    <Text className="text-zinc-900 font-bold">{item.serviceName ?? item.name ?? "Serviço"}</Text>
                    <Text className="text-zinc-500 text-sm">{item.date ?? item.createdAt ?? ""}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
