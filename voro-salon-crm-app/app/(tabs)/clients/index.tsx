import React from "react"
import { View, Text, TextInput, FlatList, Pressable, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useDataList } from "hooks/use-data-list.hook"
import { API_CONFIG } from "lib/api"
import { ScreenHeader } from "components/ScreenHeader"

interface Client {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
}

function ClientCard({ client, onPress }: { client: Client; onPress: () => void }) {
  const initials = `${client.firstName?.[0] ?? ""}${client.lastName?.[0] ?? ""}`.toUpperCase()
  return (
    <Pressable onPress={onPress} className="bg-white rounded-2xl p-4 mb-2 border border-zinc-100 flex-row items-center gap-3 active:bg-zinc-50">
      <View className="h-12 w-12 bg-purple-100 rounded-2xl items-center justify-center">
        <Text className="text-purple-700 font-black text-base">{initials}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-zinc-900 font-bold text-base">{client.firstName} {client.lastName}</Text>
        {client.phone && <Text className="text-zinc-500 text-sm">{client.phone}</Text>}
        {client.email && <Text className="text-zinc-400 text-xs">{client.email}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#d4d4d8" />
    </Pressable>
  )
}

export default function ClientsScreen() {
  const router = useRouter()
  const { filteredData, isLoading, search, setSearch } = useDataList<Client>(
    API_CONFIG.ENDPOINTS.CLIENTS,
    (c, q) => `${c.firstName} ${c.lastName} ${c.email ?? ""} ${c.phone ?? ""}`.toLowerCase().includes(q)
  )

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={[]}>
      <ScreenHeader title="Clientes" />
      <View className="bg-white px-5 pt-3 pb-4 border-b border-zinc-100">
        <View className="bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-2 flex-row items-center gap-2">
          <Ionicons name="search" size={18} color="#a1a1aa" />
          <TextInput
            className="flex-1 text-zinc-900 font-medium text-sm py-1"
            placeholder="Buscar clientes..."
            placeholderTextColor="#a1a1aa"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#7c3aed" /></View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ClientCard client={item} onPress={() => router.push(`/(tabs)/clients/${item.id}` as any)} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Ionicons name="people-outline" size={48} color="#d4d4d8" />
              <Text className="text-zinc-400 font-semibold mt-3">Nenhum cliente encontrado</Text>
            </View>
          }
        />
      )}

      <Pressable
        onPress={() => router.push("/(tabs)/clients/new" as any)}
        className="absolute bottom-24 right-5 h-14 w-14 bg-purple-600 rounded-2xl items-center justify-center shadow-lg shadow-purple-200"
      >
        <Ionicons name="add" size={28} color="white" />
      </Pressable>
    </SafeAreaView>
  )
}
