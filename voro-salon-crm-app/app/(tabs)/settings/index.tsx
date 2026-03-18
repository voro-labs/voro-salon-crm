import React from "react"
import { View, Text, Pressable, ScrollView, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useAuth } from "contexts/auth.context"
import { ScreenHeader } from "components/ScreenHeader"
import { useTenantTheme } from "contexts/tenant-theme.context"

interface NavRowProps {
  icon: string
  label: string
  subtitle?: string
  onPress?: () => void
  danger?: boolean
  iconBg?: string
  iconColor?: string
}

function NavRow({ icon, label, subtitle, onPress, danger, iconBg, iconColor }: NavRowProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 py-3.5 border-b border-zinc-50 active:bg-zinc-50"
    >
      <View
        className="h-9 w-9 rounded-xl items-center justify-center shrink-0"
        style={{ backgroundColor: iconBg ?? (danger ? "#fef2f2" : "#f5f3ff") }}
      >
        <Ionicons
          name={icon as any}
          size={18}
          color={iconColor ?? (danger ? "#ef4444" : undefined)}
        />
      </View>
      <View className="flex-1 min-w-0">
        <Text className={`font-bold text-base ${danger ? "text-red-600" : "text-zinc-900"}`}>
          {label}
        </Text>
        {subtitle ? (
          <Text className="text-zinc-500 text-xs mt-0.5" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {!danger && <Ionicons name="chevron-forward" size={16} color="#d4d4d8" />}
    </Pressable>
  )
}

function SectionLabel({ title }: { title: string }) {
  return (
    <Text className="text-zinc-500 text-xs font-bold uppercase tracking-wider px-5 mb-2 mt-5">
      {title}
    </Text>
  )
}

export default function SettingsScreen() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { primaryColor } = useTenantTheme()

  const initials =
    `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase() || "U"

  const handleLogout = () => {
    Alert.alert("Sair", "Tem certeza que deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => logout() },
    ])
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={[]}>
      <ScreenHeader title="Configurações" />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Profile Card */}
        <View className="bg-white mx-4 mt-4 rounded-3xl p-4 border border-zinc-100 items-center">
          <View className="h-20 w-20 rounded-3xl items-center justify-center mb-3" style={{ backgroundColor: primaryColor + "25" }}>
            <Text className="font-black text-2xl" style={{ color: primaryColor }}>{initials}</Text>
          </View>
          <Text className="text-xl font-black text-zinc-900 text-center">
            {user?.firstName} {user?.lastName}
          </Text>
          <Text className="text-zinc-500 text-sm mt-0.5">{user?.email}</Text>
          {(user?.tenants?.length ?? 0) > 0 && (
            <View className="mt-2 flex-row flex-wrap gap-3 justify-center">
              {user?.tenants?.map((t) => (
                <View key={t.id} className="px-3 py-1 rounded-2xl" style={{ backgroundColor: primaryColor + "15" }}>
                  <Text className="text-xs font-bold" style={{ color: primaryColor }}>{t.name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Estabelecimento */}
        <SectionLabel title="Estabelecimento" />
        <View className="bg-white mx-4 rounded-3xl px-4 border border-zinc-100">
          <NavRow
            icon="business-outline"
            label="Dados do Salão"
            subtitle="Nome, slug, logo, contato e cores"
            onPress={() => router.push("/(tabs)/settings/salon" as any)}
            iconColor={primaryColor}
          />
          <NavRow
            icon="grid-outline"
            label="Módulos"
            subtitle="Ativar/desativar funcionalidades"
            onPress={() => router.push("/(tabs)/settings/modules" as any)}
            iconBg="#f0f9ff"
            iconColor="#0284c7"
          />
          <NavRow
            icon="download-outline"
            label="Exportar Dados"
            subtitle="Clientes e serviços em CSV"
            onPress={() => router.push("/(tabs)/settings/export" as any)}
            iconBg="#f0fdf4"
            iconColor="#059669"
          />
          <NavRow
            icon="clipboard-outline"
            label="Anamnese"
            subtitle="Configurar ficha de avaliação"
            onPress={() => router.push("/(tabs)/settings/anamnesis" as any)}
            iconBg="#fff7ed"
            iconColor="#d97706"
          />
        </View>

        {/* Conta */}
        <SectionLabel title="Conta" />
        <View className="bg-white mx-4 rounded-3xl px-4 border border-zinc-100">
          <NavRow
            icon="log-out-outline"
            label="Sair"
            onPress={handleLogout}
            danger
          />
        </View>

        <Text className="text-center text-zinc-400 text-xs mt-6">Voro Salon CRM v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  )
}
