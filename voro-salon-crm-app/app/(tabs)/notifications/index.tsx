import React, { useCallback } from "react"
import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { ScreenHeader } from "components/ScreenHeader"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { useUserNotifications, type UserNotification } from "hooks/use-user-notifications.hook"

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"]

function getNotificationIcon(type: string): IoniconsName {
  switch (type?.toLowerCase()) {
    case "appointment":
      return "calendar-outline"
    case "payment":
    case "finance":
      return "wallet-outline"
    case "client":
      return "people-outline"
    case "system":
      return "information-circle-outline"
    default:
      return "notifications-outline"
  }
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diffMs = now - date
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return "agora"
  if (diffMin < 60) return `há ${diffMin} min`
  if (diffHour < 24) return `há ${diffHour}h`
  if (diffDay === 1) return "ontem"
  if (diffDay < 7) return `há ${diffDay} dias`
  return new Date(dateStr).toLocaleDateString("pt-BR")
}

interface NotificationItemProps {
  item: UserNotification
  onPress: (item: UserNotification) => void
  primaryColor: string
}

function NotificationItem({ item, onPress, primaryColor }: NotificationItemProps) {
  const icon = getNotificationIcon(item.type)

  return (
    <Pressable
      onPress={() => onPress(item)}
      className={`flex-row items-start px-4 py-4 border-b border-zinc-100 active:bg-zinc-50 ${
        item.isRead ? "bg-white" : "bg-blue-50"
      }`}
    >
      {/* Icon */}
      <View
        className="h-10 w-10 rounded-2xl items-center justify-center mr-3 shrink-0"
        style={{ backgroundColor: item.isRead ? "#f4f4f5" : primaryColor + "20" }}
      >
        <Ionicons
          name={icon}
          size={20}
          color={item.isRead ? "#a1a1aa" : primaryColor}
        />
      </View>

      {/* Content */}
      <View className="flex-1 min-w-0">
        <Text
          className={`text-sm mb-0.5 ${item.isRead ? "font-medium text-zinc-700" : "font-bold text-zinc-900"}`}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text className="text-xs text-zinc-500 leading-relaxed" numberOfLines={2}>
          {item.body}
        </Text>
        <Text className="text-[10px] text-zinc-400 mt-1 font-medium">
          {getRelativeTime(item.createdAt)}
        </Text>
      </View>

      {/* Unread dot */}
      {!item.isRead && (
        <View className="h-2 w-2 rounded-full bg-blue-500 mt-1 ml-2 shrink-0" />
      )}
    </Pressable>
  )
}

export default function NotificationsScreen() {
  const router = useRouter()
  const { primaryColor } = useTenantTheme()
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading, refresh } =
    useUserNotifications()

  const handleItemPress = useCallback(
    (item: UserNotification) => {
      if (!item.isRead) {
        markAsRead(item.id)
      }
      if (item.relatedEntityId && item.type?.toLowerCase() === "appointment") {
        router.push(`/(tabs)/appointments/${item.relatedEntityId}` as any)
      }
    },
    [markAsRead, router],
  )

  return (
    <SafeAreaView className="flex-1 bg-white" edges={[]}>
      <ScreenHeader
        title="Notificações"
        right={
          unreadCount > 0 ? (
            <Pressable onPress={markAllAsRead} className="px-2 py-1">
              <Text className="text-sm font-semibold" style={{ color: primaryColor }}>
                Marcar todas
              </Text>
            </Pressable>
          ) : undefined
        }
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={primaryColor} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationItem item={item} onPress={handleItemPress} primaryColor={primaryColor} />
          )}
          onRefresh={refresh}
          refreshing={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={notifications.length === 0 ? { flex: 1 } : { paddingBottom: 100 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <Ionicons name="notifications-off-outline" size={48} color="#d4d4d8" />
              <Text className="text-zinc-400 font-semibold mt-3 text-base">
                Nenhuma notificação ainda
              </Text>
              <Text className="text-zinc-300 text-sm mt-1 text-center px-8">
                Você verá aqui suas notificações quando chegarem
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}
