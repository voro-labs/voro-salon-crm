import React, { useState } from "react"
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
  ActivityIndicator,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useSettings } from "hooks/use-settings.hook"
import { useTenantTheme } from "contexts/tenant-theme.context"


const MODULE_NAMES: Record<number, string> = {
  1: "Clientes",
  2: "Agendamentos",
  3: "Serviços",
  4: "Funcionários",
  5: "Financeiro",
  6: "Relatórios",
  7: "Configurações",
  8: "Booking",
  9: "WhatsAppBot"
}

const MODULE_ICONS: Record<number, string> = {
  1: "people-outline",
  2: "calendar-outline",
  3: "cut-outline",
  4: "person-circle-outline",
  5: "wallet-outline",
  6: "bar-chart-outline",
  7: "settings-outline",
  8: "calendar-outline",
  9: "logo-whatsapp"
}

export default function ModulesSettingsScreen() {
  const router = useRouter()
  const { modules, isLoading, updateModule } = useSettings()
  const { primaryColor } = useTenantTheme()

  // Local editing state: moduleId → displayName being typed
  const [editingNames, setEditingNames] = useState<Record<number, string>>({})
  const [savingModule, setSavingModule] = useState<number | null>(null)

  async function handleToggle(moduleId: number, isEnabled: boolean, configuration?: string) {
    setSavingModule(moduleId)
    await updateModule(moduleId, isEnabled, configuration)
    setSavingModule(null)
  }

  async function handleSaveName(moduleId: number, isEnabled: boolean, currentConfig?: string) {
    const newName = editingNames[moduleId]
    if (newName === undefined) return

    let configParsed: Record<string, any> = {}
    try {
      if (currentConfig) configParsed = JSON.parse(currentConfig)
    } catch {}

    const newConfig = JSON.stringify({ ...configParsed, displayName: newName })
    setSavingModule(moduleId)
    const ok = await updateModule(moduleId, isEnabled, newConfig)
    if (ok) {
      setEditingNames((p) => {
        const next = { ...p }
        delete next[moduleId]
        return next
      })
    }
    setSavingModule(null)
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-50 items-center justify-center">
        <ActivityIndicator color={primaryColor} size="large" />
      </SafeAreaView>
    )
  }

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
          <Text className="text-xl font-black text-zinc-900">Módulos</Text>
          <Text className="text-zinc-400 text-xs font-semibold">
            Ative ou desative funcionalidades do sistema
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {(modules ?? []).map((mod: any) => {
          let configParsed: { displayName?: string } = {}
          try {
            if (mod.configuration) configParsed = JSON.parse(mod.configuration)
          } catch {}

          const defaultName = MODULE_NAMES[mod.module] ?? `Módulo ${mod.module}`
          const icon = MODULE_ICONS[mod.module] ?? "cube-outline"
          const isSavingThis = savingModule === mod.module
          const localName = editingNames[mod.module]
          const currentDisplayName = configParsed.displayName ?? ""

          return (
            <View
              key={mod.module}
              className={`bg-white rounded-2xl border overflow-hidden ${
                mod.isEnabled ? "border-zinc-100" : "border-zinc-100 opacity-60"
              }`}
            >
              {/* Module row */}
              <View className="flex-row items-center gap-3 px-4 py-4">
                <View className="h-10 w-10 rounded-xl items-center justify-center shrink-0" style={{ backgroundColor: primaryColor + "15" }}>
                  <Ionicons name={icon as any} size={20} color={primaryColor} />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-zinc-900 font-black text-base">
                    {currentDisplayName || defaultName}
                  </Text>
                  <Text className={`text-xs font-semibold ${mod.isEnabled ? "text-green-600" : "text-zinc-400"}`}>
                    {mod.isEnabled ? "Ativado" : "Desativado"}
                  </Text>
                </View>
                {isSavingThis ? (
                  <ActivityIndicator color={primaryColor} size="small" />
                ) : (
                  <Switch
                    value={mod.isEnabled}
                    onValueChange={(checked) =>
                      handleToggle(mod.module, checked, mod.configuration)
                    }
                    trackColor={{ false: "#e4e4e7", true: primaryColor }}
                    thumbColor="white"
                  />
                )}
              </View>

              {/* Custom name editor (only when enabled) */}
              {mod.isEnabled && (
                <View className="px-4 pb-4 pt-0 border-t border-zinc-50">
                  <Text className="text-zinc-400 text-xs font-semibold mb-1.5 mt-3">
                    Nome de exibição personalizado
                  </Text>
                  <View className="flex-row gap-2">
                    <TextInput
                      className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 font-semibold text-sm"
                      placeholder={defaultName}
                      placeholderTextColor="#a1a1aa"
                      value={localName !== undefined ? localName : currentDisplayName}
                      onChangeText={(v) =>
                        setEditingNames((p) => ({ ...p, [mod.module]: v }))
                      }
                    />
                    <Pressable
                      onPress={() =>
                        handleSaveName(mod.module, mod.isEnabled, mod.configuration)
                      }
                      disabled={localName === undefined || isSavingThis}
                      className="h-10 w-10 rounded-xl items-center justify-center"
                      style={{ backgroundColor: localName !== undefined ? primaryColor : "#f4f4f5" }}
                    >
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={localName !== undefined ? "white" : "#a1a1aa"}
                      />
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          )
        })}

        {(!modules || modules.length === 0) && (
          <View className="items-center py-16">
            <Ionicons name="grid-outline" size={48} color="#d4d4d8" />
            <Text className="text-zinc-400 font-semibold mt-3 text-base">Nenhum módulo encontrado</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
