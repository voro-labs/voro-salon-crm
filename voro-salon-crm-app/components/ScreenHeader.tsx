import React from "react"
import { View, Text, Pressable } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"

interface ScreenHeaderProps {
  title: string
  showBack?: boolean
  right?: React.ReactNode
}

export function ScreenHeader({ title, showBack = false, right }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  return (
    <View
      className="bg-white border-b border-zinc-100"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-row items-center px-5 h-14">
        {showBack ? (
          <Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center -ml-1 mr-2">
            <Ionicons name="chevron-back" size={24} color="#7c3aed" />
          </Pressable>
        ) : null}
        <Text className="flex-1 text-xl font-black text-zinc-900">{title}</Text>
        {right ?? null}
      </View>
    </View>
  )
}
