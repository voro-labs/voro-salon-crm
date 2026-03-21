import React from "react"
import { View, Text, Pressable } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { useUserNotifications } from "hooks/use-user-notifications.hook"

export function NotificationBell() {
  const router = useRouter()
  const { primaryColor } = useTenantTheme()
  const { unreadCount } = useUserNotifications()

  return (
    <Pressable
      onPress={() => router.push("/(tabs)/notifications" as any)}
      className="relative h-9 w-9 items-center justify-center"
      hitSlop={8}
    >
      <Ionicons name="notifications-outline" size={24} color={primaryColor} />
      {unreadCount > 0 && (
        <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[18px] h-[18px] items-center justify-center px-[3px]">
          <Text className="text-white text-[10px] font-bold leading-none">
            {unreadCount > 99 ? "99+" : String(unreadCount)}
          </Text>
        </View>
      )}
    </Pressable>
  )
}
