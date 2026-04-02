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

export function NotificationsScreen({ rootPath = "/(tabs)" }: { rootPath?: string }) {
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
        <View className="bg-white px-5 py-3 flex-row items-center justify-between border-b border-zinc-100 shadow-sm z-10">
          <Pressable onPress={toggleSelectAll} className="flex-row items-center gap-3 active:opacity-60">
            <View className={`h-6 w-6 rounded-lg items-center justify-center border-2 ${selectedIds.size === notifications.length ? "bg-zinc-900 border-zinc-900" : "border-zinc-200"}`}>
              {selectedIds.size === notifications.length && <Ionicons name="checkmark" size={14} color="white" />}
            </View>
            <Text className="text-sm font-black text-zinc-900">
              {selectedIds.size === notifications.length ? "Desmarcar Todos" : "Selecionar Todos"}
            </Text>
          </Pressable>
          <View className="bg-zinc-100 px-3 py-1 rounded-full">
            <Text className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              {selectedIds.size} selecionados
            </Text>
          </View>
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
            renderItem={({ item }) => {
              const isSelected = selectedIds.has(item.id)
              return (
                <View className={`flex-row items-center ${isSelected ? "bg-zinc-50" : "bg-white"}`}>
                  {selectionMode && (
                    <Pressable 
                       onPress={() => handleItemPress(item)}
                       className="pl-5 pr-2 h-full justify-center"
                    >
                      <View className={`h-6 w-6 rounded-lg items-center justify-center border-2 ${isSelected ? "bg-zinc-900 border-zinc-900" : "border-zinc-200"}`}>
                        {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
                      </View>
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
              )
            }}
            onRefresh={refresh}
            refreshing={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={notifications.length === 0 ? { flex: 1 } : { paddingBottom: 140 }}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-20">
                <View className="h-20 w-20 bg-zinc-50 rounded-full items-center justify-center mb-4">
                  <Ionicons name="notifications-off-outline" size={32} color="#d4d4d8" />
                </View>
                <Text className="text-zinc-600 font-black text-lg">Sem avisos por aqui</Text>
                <Text className="text-zinc-400 text-sm mt-1">Suas notificações aparecerão aqui.</Text>
              </View>
            }
          />

          {selectionMode && selectedIds.size > 0 && (
            <View className="absolute bottom-8 left-6 right-6">
              <Pressable
                onPress={handleBatchDelete}
                className="bg-zinc-900 h-16 rounded-[24px] flex-row items-center justify-center gap-3 shadow-xl active:opacity-90"
              >
                <Ionicons name="trash" size={20} color="white" />
                <Text className="text-white font-black text-base">
                  Excluir {selectedIds.size} {selectedIds.size === 1 ? "notificação" : "notificações"}
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
      <View
        className="h-10 w-10 rounded-2xl items-center justify-center mr-3 shrink-0"
        style={{ backgroundColor: item.isRead ? "#f4f4f5" : primaryColor + "20" }}
      >
        <Ionicons name={icon} size={20} color={item.isRead ? "#a1a1aa" : primaryColor} />
      </View>

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
