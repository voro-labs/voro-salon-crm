import React from "react"
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useSettings } from "hooks/use-settings.hook"
import { useTenantTheme } from "contexts/tenant-theme.context"

interface ExportCardProps {
  icon: string
  title: string
  description: string
  buttonLabel: string
  isLoading: boolean
  onPress: () => void
  color: string
  bg: string
  border: string
}

function ExportCard({
  icon,
  title,
  description,
  buttonLabel,
  isLoading,
  onPress,
  color,
  bg,
  border,
}: ExportCardProps) {
  return (
    <View className="bg-white rounded-2xl border border-zinc-100 p-4 flex-row items-center gap-4">
      <View
        className="h-12 w-12 rounded-2xl items-center justify-center shrink-0"
        style={{ backgroundColor: bg, borderWidth: 1, borderColor: border }}
      >
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <View className="flex-1 min-w-0">
        <Text className="text-zinc-900 font-black text-base">{title}</Text>
        <Text className="text-zinc-400 text-xs font-semibold mt-0.5">{description}</Text>
      </View>
      <Pressable
        onPress={onPress}
        disabled={isLoading}
        className="h-10 px-4 rounded-xl items-center justify-center flex-row gap-2"
        style={{ backgroundColor: isLoading ? "#e4e4e7" : bg, borderWidth: 1, borderColor: border }}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={color} />
        ) : (
          <>
            <Ionicons name="download-outline" size={15} color={color} />
            <Text className="font-bold text-xs" style={{ color }}>
              {buttonLabel}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  )
}

export default function ExportSettingsScreen() {
  const router = useRouter()
  const { isExportingClients, isExportingServices, exportData } = useSettings()
  const { primaryColor } = useTenantTheme()

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      {/* Header */}
      <View className="bg-white px-5 pt-4 pb-4 border-b border-zinc-100 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          className="h-9 w-9 bg-zinc-50 rounded-xl items-center justify-center border border-zinc-100"
        >
          <Ionicons name="chevron-back" size={20} color="#18181b" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-black text-zinc-900">Exportar Dados</Text>
          <Text className="text-zinc-400 text-xs font-semibold">
            Exporte seus dados em formato CSV
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Info banner */}
        <View className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex-row items-start gap-3">
          <Ionicons name="information-circle-outline" size={20} color="#1d4ed8" />
          <Text className="flex-1 text-blue-700 text-sm font-semibold leading-relaxed">
            Os dados serão exportados em formato CSV, compatível com Microsoft Excel, Google Sheets e outros editores de planilhas.
          </Text>
        </View>

        {/* Clients */}
        <ExportCard
          icon="people-outline"
          title="Clientes"
          description="Nome, contato, histórico e informações cadastrais"
          buttonLabel="Exportar"
          isLoading={isExportingClients}
          onPress={() => exportData("clients")}
          color="#059669"
          bg="#f0fdf4"
          border="#bbf7d0"
        />

        {/* Services */}
        <ExportCard
          icon="cut-outline"
          title="Serviços"
          description="Nome, preço, duração e descrição dos serviços"
          buttonLabel="Exportar"
          isLoading={isExportingServices}
          onPress={() => exportData("services")}
          color={primaryColor}
          bg={primaryColor + "15"}
          border={primaryColor + "30"}
        />
      </ScrollView>
    </SafeAreaView>
  )
}
