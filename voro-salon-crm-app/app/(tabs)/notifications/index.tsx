import React, { useCallback } from "react"
import { View, Text, FlatList, Pressable, ActivityIndicator, Alert } from "react-native"
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
  onDelete: (id: string) => void
  primaryColor: string
  disabledActions?: boolean
}

export default function NotificationsScreen() {
  const router = useRouter()
  const { primaryColor } = useTenantTheme()
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteMultipleNotifications,
    isLoading,
    refresh,
  } = useUserNotifications()

  const [selectionMode, setSelectionMode] = React.useState(false)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())

  const handleItemPress = useCallback(
    (item: UserNotification) => {
      if (selectionMode) {
        const next = new Set(selectedIds)
        if (next.has(item.id)) next.delete(item.id)
        else next.add(item.id)
        setSelectedIds(next)
        return
      }

      if (!item.isRead) {
        markAsRead(item.id)
      }
      if (item.relatedEntityId && item.type?.toLowerCase() === "appointment") {
        router.push(`/(tabs)/appointments/${item.relatedEntityId}` as any)
      }
    },
    [selectionMode, selectedIds, markAsRead, router]
  )

  const toggleSelectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(notifications.map((n) => n.id)))
    }
  }

  const handleDelete = (id: string) => {
    if (selectionMode) return
    Alert.alert("Remover Notificação", "Deseja remover esta notificação?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => deleteNotification(id) },
    ])
  }

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return
    Alert.alert(
      "Remover selecionadas",
      `Deseja remover as ${selectedIds.size} notificações selecionadas?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            await deleteMultipleNotifications(Array.from(selectedIds))
            setSelectedIds(new Set())
            setSelectionMode(false)
          },
        },
      ]
    )
  }

  const handleToggleSelection = () => {
    if (selectionMode) {
      setSelectionMode(false)
      setSelectedIds(new Set())
    } else {
      setSelectionMode(true)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={[]}>
      <ScreenHeader
        title="Notificações"
        right={
          <View className="flex-row items-center gap-1">
            {notifications.length > 0 && (
              <Pressable onPress={handleToggleSelection} className="px-2 py-1">
                <Text className="text-sm font-bold" style={{ color: selectionMode ? "#ef4444" : primaryColor }}>
                  {selectionMode ? "Cancelar" : "Editar"}
                </Text>
              </Pressable>
            )}
            {!selectionMode && unreadCount > 0 && (
              <Pressable onPress={markAllAsRead} className="px-2 py-1">
                <Ionicons name="checkmark-done" size={20} color={primaryColor} />
              </Pressable>
            )}
          </View>
        }
      />

      {selectionMode && (
        <View className="bg-zinc-50 px-4 py-2 flex-row items-center justify-between border-b border-zinc-100">
          <Pressable onPress={toggleSelectAll} className="flex-row items-center gap-2">
            <Ionicons
              name={selectedIds.size === notifications.length ? "checkbox" : "square-outline"}
              size={20}
              color={primaryColor}
            />
            <Text className="text-xs font-bold text-zinc-600">
              Selecionar todas ({notifications.length})
            </Text>
          </Pressable>
          <Text className="text-xs font-medium text-zinc-400">
            {selectedIds.size} selecionadas
          </Text>
        </View>
      )}

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={primaryColor} />
        </View>
      ) : (
        <View className="flex-1">
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View className="flex-row items-center">
                {selectionMode && (
                  <Pressable 
                    onPress={() => handleItemPress(item)}
                    className="pl-4 pr-1 h-full justify-center"
                  >
                    <Ionicons
                      name={selectedIds.has(item.id) ? "checkbox" : "square-outline"}
                      size={24}
                      color={selectedIds.has(item.id) ? primaryColor : "#d4d4d8"}
                    />
                  </Pressable>
                )}
                <View className="flex-1">
                  <NotificationItem
                    item={item}
                    onPress={handleItemPress}
                    onDelete={handleDelete}
                    primaryColor={primaryColor}
                    disabledActions={selectionMode}
                  />
                </View>
              </View>
            )}
            onRefresh={refresh}
            refreshing={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={notifications.length === 0 ? { flex: 1 } : { paddingBottom: 120 }}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-20">
                <Ionicons name="notifications-off-outline" size={48} color="#d4d4d8" />
                <Text className="text-zinc-400 font-semibold mt-3 text-base">
                  Nenhuma notificação ainda
                </Text>
              </View>
            }
          />

          {selectionMode && selectedIds.size > 0 && (
            <View className="absolute bottom-10 left-6 right-6">
              <Pressable
                onPress={handleBatchDelete}
                className="bg-red-500 h-14 rounded-2xl flex-row items-center justify-center gap-2 shadow-lg"
              >
                <Ionicons name="trash" size={20} color="white" />
                <Text className="text-white font-black text-lg">
                  Remover selecionadas ({selectedIds.size})
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  )
}

function NotificationItem({
  item,
  onPress,
  onDelete,
  primaryColor,
  disabledActions = false,
}: NotificationItemProps) {
  const icon = getNotificationIcon(item.type)

  return (
    <Pressable
      onPress={() => onPress(item)}
      className={`flex-row items-center px-4 py-4 border-b border-zinc-100 active:bg-zinc-50 ${
        item.isRead ? "bg-white" : "bg-blue-50/30"
      }`}
    >
      {/* Icon */}
      <View
        className="h-10 w-10 rounded-2xl items-center justify-center mr-3 shrink-0"
        style={{ backgroundColor: item.isRead ? "#f4f4f5" : primaryColor + "20" }}
      >
        <Ionicons name={icon} size={20} color={item.isRead ? "#a1a1aa" : primaryColor} />
      </View>

      {/* Content */}
      <View className="flex-1 min-w-0">
        <Text
          className={`text-sm mb-0.5 ${item.isRead ? "font-medium text-zinc-700" : "font-bold text-zinc-900"}`}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text className="text-xs text-zinc-400 leading-relaxed" numberOfLines={2}>
          {item.body}
        </Text>
        <Text className="text-[10px] text-zinc-400 mt-1 font-medium">
          {getRelativeTime(item.createdAt)}
        </Text>
      </View>

      {/* Actions */}
      {!disabledActions && (
        <View className="flex-row items-center ml-2">
          {!item.isRead && <View className="h-2 w-2 rounded-full bg-blue-500 mr-2 shrink-0" />}
          <Pressable
            onPress={() => onDelete(item.id)}
            hitSlop={10}
            className="h-8 w-8 items-center justify-center rounded-full active:bg-zinc-100"
          >
            <Ionicons name="trash-outline" size={16} color="#ef4444" />
          </Pressable>
        </View>
      )}
    </Pressable>
  )
}
