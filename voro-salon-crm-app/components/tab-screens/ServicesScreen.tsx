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
import useSWR from "swr"
import { useDataList } from "hooks/use-data-list.hook"
import { API_CONFIG } from "lib/api"
import { fetcher } from "lib/fetcher"
import { ScreenHeader } from "components/ScreenHeader"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { useModuleGuard } from "hooks/use-module-guard.hook"

interface Service {
  id: string
  name: string
  durationMinutes?: number
  price?: number
  description?: string
}

interface ServicePromotion {
  id: string
  serviceId: string
  promotionalPrice: number
  daysOfWeek: number[]
  validFrom?: string
  validUntil?: string
  isActive: boolean
}

function formatDuration(minutes: number): string {
  if (!minutes) return ""
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function getActivePromotion(serviceId: string, promotions: ServicePromotion[]): ServicePromotion | null {
  const now = new Date()
  const todayDow = now.getDay()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return promotions.find((p) => {
    if (p.serviceId !== serviceId || !p.isActive) return false
    if (!p.daysOfWeek.includes(todayDow)) return false
    if (p.validFrom) {
      const [y, m, d] = p.validFrom.split("-").map(Number)
      if (today < new Date(y, m - 1, d)) return false
    }
    if (p.validUntil) {
      const [y, m, d] = p.validUntil.split("-").map(Number)
      if (today > new Date(y, m - 1, d)) return false
    }
    return true
  }) ?? null
}

export function ServicesScreen({ rootPath = "/(tabs)" }: { rootPath?: string }) {
  useModuleGuard("services")
  const router = useRouter()
  const { primaryColor } = useTenantTheme()
  const { items, isLoading, isLoadingMore, totalCount, search, setSearch, loadMore, refresh } =
    useDataList<Service>(API_CONFIG.ENDPOINTS.SERVICES)

  const { data: _promosRaw } = useSWR("/ServicePromotion", fetcher)
  const promotions: ServicePromotion[] = (() => {
    if (!_promosRaw) return []
    if (Array.isArray(_promosRaw)) return _promosRaw
    if (Array.isArray(_promosRaw?.items)) return _promosRaw.items
    if (Array.isArray(_promosRaw?.data)) return _promosRaw.data
    return []
  })()

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

      {!isLoading && totalCount > 0 && (
        <View className="px-5 py-2 bg-white border-b border-zinc-100">
          <Text className="text-xs text-zinc-400 font-medium">
            {items.length < totalCount
              ? `Mostrando ${items.length} de ${totalCount} serviço${totalCount !== 1 ? "s" : ""}`
              : `${totalCount} serviço${totalCount !== 1 ? "s" : ""}`}
          </Text>
        </View>
      )}

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={primaryColor} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const promo = getActivePromotion(item.id, promotions)
            return (
              <Pressable
                onPress={() => router.push(`${rootPath}/services/${item.id}` as any)}
                className="bg-white rounded-2xl p-4 mb-2 border border-zinc-100 flex-row items-center gap-3 active:bg-zinc-50"
              >
                <View className="h-12 w-12 rounded-2xl items-center justify-center" style={{ backgroundColor: primaryColor + "15" }}>
                  <Ionicons name="cut-outline" size={22} color={primaryColor} />
                </View>
                <View className="flex-1">
                  <Text className="text-zinc-900 font-bold text-base">{item.name}</Text>
                  <View className="flex-row flex-wrap gap-x-3 gap-y-0.5 mt-1 items-center">
                    {item.durationMinutes ? (
                      <Text className="text-zinc-500 text-sm">
                        {formatDuration(item.durationMinutes)}
                      </Text>
                    ) : null}
                    {item.price != null ? (
                      promo ? (
                        <View className="flex-row items-center gap-1.5">
                          <Text className="text-zinc-400 text-sm line-through">
                            R$ {item.price.toFixed(2)}
                          </Text>
                          <Text className="text-sm font-bold text-green-600">
                            R$ {promo.promotionalPrice.toFixed(2)}
                          </Text>
                          <View className="bg-green-100 rounded px-1">
                            <Text className="text-green-700 text-[10px] font-bold">PROMO</Text>
                          </View>
                        </View>
                      ) : (
                        <Text className="font-bold text-sm" style={{ color: primaryColor }}>
                          R$ {item.price.toFixed(2)}
                        </Text>
                      )
                    ) : null}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#d4d4d8" />
              </Pressable>
            )
          }}
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
