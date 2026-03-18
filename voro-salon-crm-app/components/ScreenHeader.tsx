import React from "react"
import { View, Text, Pressable } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useTenantTheme } from "contexts/tenant-theme.context"

interface ScreenHeaderProps {
  title: string
  showBack?: boolean
  onBack?: () => void
  right?: React.ReactNode
}

export function ScreenHeader({ title, showBack = false, onBack, right }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets()
  const { primaryColor } = useTenantTheme()

  return (
    <View
      className="bg-white border-b border-zinc-100"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-row items-center px-5 h-14">
        {showBack ? (
          <Pressable onPress={onBack} className="h-9 w-9 items-center justify-center -ml-1 mr-2">
            <Ionicons name="chevron-back" size={24} color={primaryColor} />
          </Pressable>
        ) : null}
        <Text className="flex-1 text-xl font-black text-zinc-900">{title}</Text>
        {right ?? null}
      </View>
    </View>
  )
}
