import React from "react"
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useServiceDetail } from "hooks/use-service-detail.hook"
import { CurrencyInput } from "components/CurrencyInput"
import { DurationInput } from "components/DurationInput"
import { useTenantTheme } from "contexts/tenant-theme.context"

export default function NewServiceScreen() {
  const router = useRouter()
  const { form, setForm, isSaving, createService } = useServiceDetail()
  const { primaryColor } = useTenantTheme()

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <View className="bg-white px-5 pt-4 pb-4 border-b border-zinc-100 flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} className="h-9 w-9 bg-zinc-50 rounded-xl items-center justify-center border border-zinc-100">
            <Ionicons name="chevron-back" size={20} color="#18181b" />
          </Pressable>
          <Text className="text-xl font-black text-zinc-900">Novo Serviço</Text>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
          <View className="mb-4">
            <Text className="text-zinc-700 font-bold text-sm mb-1.5">Nome *</Text>
            <TextInput
              className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base"
              placeholder="Nome do serviço"
              placeholderTextColor="#a1a1aa"
              value={form.name}
              onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
            />
          </View>

          <View className="mb-4">
            <Text className="text-zinc-700 font-bold text-sm mb-1.5">Descrição</Text>
            <TextInput
              className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base h-20"
              placeholder="Descrição do serviço"
              placeholderTextColor="#a1a1aa"
              value={form.description}
              onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View className="mb-4">
            <Text className="text-zinc-700 font-bold text-sm mb-1.5">Duração</Text>
            <DurationInput
              value={form.durationMinutes}
              onChange={(v) => setForm((p) => ({ ...p, durationMinutes: v }))}
            />
          </View>

          <View className="mb-6">
            <Text className="text-zinc-700 font-bold text-sm mb-1.5">Preço</Text>
            <CurrencyInput
              value={form.price}
              onChange={(v) => setForm((p) => ({ ...p, price: v }))}
            />
          </View>

          <Pressable
            onPress={() => createService(form)}
            disabled={isSaving}
            className="h-14 rounded-2xl items-center justify-center"
            style={{ backgroundColor: isSaving ? primaryColor + "99" : primaryColor }}
          >
            {isSaving ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-base">Salvar Serviço</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
