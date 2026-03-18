import React from "react"
import { View, Text, Pressable, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"

export default function AnamnesisSettingsScreen() {
  const router = useRouter()

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
          <Text className="text-xl font-black text-zinc-900">Anamnese</Text>
          <Text className="text-zinc-400 text-xs font-semibold">
            Ficha de avaliação capilar
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Info */}
        <View className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex-row items-start gap-3">
          <Ionicons name="information-circle-outline" size={20} color="#d97706" />
          <Text className="flex-1 text-amber-700 text-sm font-semibold leading-relaxed">
            O gerenciamento completo das fichas de anamnese está disponível na versão web do Voro Salon CRM, com mais recursos de edição.
          </Text>
        </View>

        {/* Features list */}
        <View className="bg-white rounded-2xl border border-zinc-100 px-4">
          {[
            { icon: "create-outline",        label: "Criar e editar perguntas" },
            { icon: "list-outline",          label: "Organizar seções" },
            { icon: "options-outline",       label: "Tipos de campo configuráveis" },
            { icon: "checkmark-circle-outline", label: "Campos obrigatórios" },
            { icon: "share-outline",         label: "Importar/exportar templates" },
          ].map((item, i, arr) => (
            <View
              key={item.icon}
              className={`flex-row items-center gap-3 py-3.5 ${i < arr.length - 1 ? "border-b border-zinc-50" : ""}`}
            >
              <View className="h-8 w-8 bg-amber-50 rounded-xl items-center justify-center">
                <Ionicons name={item.icon as any} size={16} color="#d97706" />
              </View>
              <Text className="text-zinc-700 font-semibold text-sm">{item.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
