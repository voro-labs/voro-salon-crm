import React from "react"
import { View, Text, Pressable, ScrollView, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useAuth } from "contexts/auth.context"

interface SettingRowProps {
  icon: string
  label: string
  value?: string
  onPress?: () => void
  danger?: boolean
}

function SettingRow({ icon, label, value, onPress, danger }: SettingRowProps) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3 py-3.5 border-b border-zinc-100 active:bg-zinc-50">
      <View className={`h-9 w-9 rounded-xl items-center justify-center ${danger ? "bg-red-50" : "bg-purple-50"}`}>
        <Ionicons name={icon as any} size={18} color={danger ? "#ef4444" : "#7c3aed"} />
      </View>
      <View className="flex-1">
        <Text className={`font-bold text-base ${danger ? "text-red-600" : "text-zinc-900"}`}>{label}</Text>
        {value && <Text className="text-zinc-500 text-sm">{value}</Text>}
      </View>
      {!danger && <Ionicons name="chevron-forward" size={16} color="#d4d4d8" />}
    </Pressable>
  )
}

export default function SettingsScreen() {
  const { user, logout } = useAuth()

  const handleLogout = () => {
    Alert.alert("Sair", "Tem certeza que deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: logout },
    ])
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <View className="bg-white px-5 pt-4 pb-4 border-b border-zinc-100">
        <Text className="text-2xl font-black text-zinc-900">Configurações</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View className="bg-white mx-4 mt-4 rounded-3xl p-5 border border-zinc-100 items-center mb-4">
          <View className="h-20 w-20 bg-purple-100 rounded-3xl items-center justify-center mb-3">
            <Text className="text-purple-700 font-black text-2xl">
              {`${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase() || "U"}
            </Text>
          </View>
          <Text className="text-xl font-black text-zinc-900">{user?.firstName} {user?.lastName}</Text>
          <Text className="text-zinc-500 text-sm">{user?.email}</Text>
          {user?.tenants?.[0]?.name && (
            <View className="mt-2 px-3 py-1 bg-purple-50 rounded-full">
              <Text className="text-purple-600 text-xs font-bold">{user.tenants[0].name}</Text>
            </View>
          )}
        </View>

        {/* Settings List */}
        <View className="bg-white mx-4 rounded-3xl px-4 border border-zinc-100 mb-4">
          <SettingRow icon="person-outline" label="Meu Perfil" />
          <SettingRow icon="business-outline" label="Dados do Salão" />
          <SettingRow icon="notifications-outline" label="Notificações" />
          <SettingRow icon="color-palette-outline" label="Aparência" />
          <SettingRow icon="help-circle-outline" label="Ajuda e Suporte" />
        </View>

        <View className="bg-white mx-4 rounded-3xl px-4 border border-zinc-100 mb-4">
          <SettingRow icon="log-out-outline" label="Sair" onPress={handleLogout} danger />
        </View>

        <Text className="text-center text-zinc-400 text-xs mb-8">Voro Salon CRM v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  )
}
