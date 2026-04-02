import React from "react"
import { View, Text, TextInput, FlatList, Pressable, ActivityIndicator, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useDataList } from "hooks/use-data-list.hook"
import { API_CONFIG } from "lib/api"
import { ScreenHeader } from "components/ScreenHeader"
import { formatPhone } from "@/lib/mask-utils"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { useModuleGuard } from "hooks/use-module-guard.hook"
import { usePlanLimits } from "hooks/use-plan-limits.hook"

interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  serviceCount?: number
}

function ClientCard({ client, onPress, primaryColor }: { client: Client; onPress: () => void; primaryColor: string }) {
  const initials = `${client.name?.[0] ?? ""}`.toUpperCase()

  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl p-4 mb-2 border border-zinc-100 flex-row items-center gap-3 active:bg-zinc-50"
    >
      <View className="w-16 items-center justify-center rounded-2xl py-4 px-4 shrink-0" style={{ backgroundColor: primaryColor + "15" }}>
        <Text className="font-black text-base" style={{ color: primaryColor }}>{initials}</Text>
      </View>

      <View className="flex-1 min-w-0">
        <Text className="text-zinc-900 font-bold text-base" numberOfLines={1}>{client.name}</Text>
        <View className="flex-row flex-wrap gap-x-3 mt-0.5">
          {client.phone ? (
            <View className="flex-row items-center gap-1">
              <Ionicons name="call-outline" size={12} color="#a1a1aa" />
              <Text className="text-zinc-500 text-xs">{formatPhone(client.phone)}</Text>
            </View>
          ) : null}
          {client.email ? (
            <View className="flex-row items-center gap-1">
              <Ionicons name="mail-outline" size={12} color="#a1a1aa" />
              <Text className="text-zinc-400 text-xs" numberOfLines={1}>{client.email}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View className="flex-row items-center gap-2 shrink-0">
        {(client.serviceCount ?? 0) > 0 && (
          <View className="rounded-2xl px-2.5 py-0.5" style={{ backgroundColor: primaryColor + "15", borderWidth: 1, borderColor: primaryColor + "25" }}>
            <Text className="text-xs font-bold" style={{ color: primaryColor }}>
              {client.serviceCount} {client.serviceCount === 1 ? "serviço" : "serviços"}
            </Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color="#d4d4d8" />
      </View>
    </Pressable>
  )
}

export function ClientsScreen({ rootPath = "/(tabs)" }: { rootPath?: string }) {
  useModuleGuard("clients")
  const router = useRouter()
  const { primaryColor } = useTenantTheme()
  const { maxClients } = usePlanLimits()
  const { filteredData, isLoading, search, setSearch } = useDataList<Client>(
    API_CONFIG.ENDPOINTS.CLIENTS,
    (c, q) => `${c.name} ${c.email ?? ""} ${c.phone ?? ""}`.toLowerCase().includes(q)
  )

  function handleAddClient() {
    const totalClients = (filteredData ?? []).length
    if (maxClients > 0 && totalClients >= maxClients) {
      Alert.alert(
        "Limite atingido",
        `Seu plano permite até ${maxClients} cliente${maxClients === 1 ? "" : "s"}. Faça upgrade para adicionar mais.`,
        [{ text: "OK" }]
      )
      return
    }
    router.push(`${rootPath}/clients/new` as any)
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={[]}>
      <ScreenHeader title="Clientes" />

      <View className="bg-white px-5 pt-3 p-4 pb-4 border-b border-zinc-100 flex-row items-center gap-3">
        <View className="flex-1 bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-2 flex-row items-center gap-2">
          <Ionicons name="search" size={18} color="#a1a1aa" />
          <TextInput
            className="flex-1 text-zinc-900 font-medium text-sm py-1"
            placeholder="Buscar por nome, telefone ou e-mail..."
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
          onPress={handleAddClient}
          className="h-11 w-11 rounded-2xl items-center justify-center"
          style={{ backgroundColor: primaryColor }}
        >
          <Ionicons name="add" size={24} color="white" />
        </Pressable>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={primaryColor} />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ClientCard client={item} primaryColor={primaryColor} onPress={() => router.push(`${rootPath}/clients/${item.id}` as any)} />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Ionicons name="people-outline" size={48} color="#d4d4d8" />
              <Text className="text-zinc-400 font-semibold mt-3 text-base">
                {search ? "Nenhum resultado encontrado" : "Nenhum cliente cadastrado"}
              </Text>
              {!search && (
                <Text className="text-zinc-300 text-sm mt-1">Comece adicionando seu primeiro cliente</Text>
              )}
            </View>
          }
        />
      )}

    </SafeAreaView>
  )
}
