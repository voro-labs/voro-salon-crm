import React from "react"
import { View, Text, TextInput, FlatList, Pressable, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useDataList } from "hooks/use-data-list.hook"
import { API_CONFIG } from "lib/api"
import { ScreenHeader } from "components/ScreenHeader"

interface Service {
  id: string
  name: string
  duration?: number
  price?: number
  description?: string
}

export default function ServicesScreen() {
  const router = useRouter()
  const { filteredData, isLoading, search, setSearch } = useDataList<Service>(
    API_CONFIG.ENDPOINTS.SERVICES,
    (s, q) => `${s.name} ${s.description ?? ""}`.toLowerCase().includes(q)
  )

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={[]}>
      <ScreenHeader title="Serviços" />
      <View className="bg-white px-5 pt-3 pb-4 border-b border-zinc-100 flex-row items-center gap-3">
        <View className="flex-1 bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-2 flex-row items-center gap-2">
          <Ionicons name="search" size={18} color="#a1a1aa" />
          <TextInput className="flex-1 text-zinc-900 font-medium text-sm py-1" placeholder="Buscar serviços..." placeholderTextColor="#a1a1aa" value={search} onChangeText={setSearch} />
        </View>
        <Pressable
          onPress={() => router.push("/(tabs)/services/new" as any)}
          className="h-11 w-11 bg-purple-600 rounded-2xl items-center justify-center"
        >
          <Ionicons name="add" size={24} color="white" />
        </Pressable>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#7c3aed" /></View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/(tabs)/services/${item.id}` as any)} className="bg-white rounded-2xl p-4 mb-2 border border-zinc-100 flex-row items-center gap-3 active:bg-zinc-50">
              <View className="h-12 w-12 bg-purple-50 rounded-2xl items-center justify-center">
                <Ionicons name="cut-outline" size={22} color="#7c3aed" />
              </View>
              <View className="flex-1">
                <Text className="text-zinc-900 font-bold text-base">{item.name}</Text>
                <View className="flex-row gap-3 mt-1">
                  {item.duration && <Text className="text-zinc-500 text-sm">{item.duration} min</Text>}
                  {item.price != null && <Text className="text-purple-600 font-bold text-sm">R$ {item.price.toFixed(2)}</Text>}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#d4d4d8" />
            </Pressable>
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Ionicons name="cut-outline" size={48} color="#d4d4d8" />
              <Text className="text-zinc-400 font-semibold mt-3">Nenhum serviço cadastrado</Text>
            </View>
          }
        />
      )}

    </SafeAreaView>
  )
}
