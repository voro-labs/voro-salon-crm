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

interface Service {
  id: string
  name: string
  duration?: number
  price?: number
  description?: string
}

export function ServicesScreen({ rootPath = "/(tabs)" }: { rootPath?: string }) {
  useModuleGuard("services")
  const router = useRouter()
  const { primaryColor } = useTenantTheme()
  const { items, isLoading, isLoadingMore, search, setSearch, loadMore, refresh } =
    useDataList<Service>(API_CONFIG.ENDPOINTS.SERVICES)

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={[]}>
      <ScreenHeader title="Serviços" />
      <View className="bg-white px-5 pt-3 p-4 pb-4 border-b border-zinc-100 flex-row items-center gap-3">
        <View className="flex-1 bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-2 flex-row items-center gap-2">
          <Ionicons name="search" size={18} color="#a1a1aa" />
          <TextInput
            className="flex-1 text-zinc-900 font-medium text-sm py-1"
            placeholder="Buscar serviços..."
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
          onPress={() => router.push(`${rootPath}/services/new` as any)}
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
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`${rootPath}/services/${item.id}` as any)}
              className="bg-white rounded-2xl p-4 mb-2 border border-zinc-100 flex-row items-center gap-3 active:bg-zinc-50"
            >
              <View className="h-12 w-12 rounded-2xl items-center justify-center" style={{ backgroundColor: primaryColor + "15" }}>
                <Ionicons name="cut-outline" size={22} color={primaryColor} />
              </View>
              <View className="flex-1">
                <Text className="text-zinc-900 font-bold text-base">{item.name}</Text>
                <View className="flex-row gap-3 mt-1">
                  {item.duration ? <Text className="text-zinc-500 text-sm">{item.duration} min</Text> : null}
                  {item.price != null ? (
                    <Text className="font-bold text-sm" style={{ color: primaryColor }}>
                      R$ {item.price.toFixed(2)}
                    </Text>
                  ) : null}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#d4d4d8" />
            </Pressable>
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
              <Ionicons name="cut-outline" size={48} color="#d4d4d8" />
              <Text className="text-zinc-400 font-semibold mt-3">
                {search ? "Nenhum resultado encontrado" : "Nenhum serviço cadastrado"}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}
