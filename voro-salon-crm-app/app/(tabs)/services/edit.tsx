import React from "react"
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter, useLocalSearchParams } from "expo-router"
import { ScreenHeader } from "components/ScreenHeader"
import { useServiceDetail } from "hooks/use-service-detail.hook"
import { CurrencyInput } from "components/CurrencyInput"
import { DurationInput } from "components/DurationInput"
import { useTenantTheme } from "contexts/tenant-theme.context"

export default function EditServiceScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { form, setForm, isLoading, isSaving, updateService } = useServiceDetail(id)
  const { primaryColor } = useTenantTheme()

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-50 items-center justify-center">
        <ActivityIndicator color={primaryColor} size="large" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">

        <ScreenHeader title="Editar Serviço" showBack onBack={() => router.back()} />

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Nome */}
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

          {/* Descrição */}
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

          {/* Duração + Preço */}
          <View className="flex-row gap-3 mb-6">
            <View className="flex-1">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Duração</Text>
              <DurationInput
                value={form.durationMinutes}
                onChange={(v) => setForm((p) => ({ ...p, durationMinutes: v }))}
              />
            </View>
            <View className="flex-1">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Preço</Text>
              <CurrencyInput
                value={form.price}
                onChange={(v) => setForm((p) => ({ ...p, price: v }))}
              />
            </View>
          </View>

          <Pressable
            onPress={() => updateService(form)}
            disabled={isSaving}
            className="h-14 rounded-2xl items-center justify-center"
            style={{ backgroundColor: isSaving ? primaryColor + "99" : primaryColor }}
          >
            {isSaving
              ? <ActivityIndicator color="white" />
              : <Text className="text-white font-black text-base">Salvar Alterações</Text>
            }
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
