import React from "react"
import {
  View, Text, TextInput, Pressable,
  ActivityIndicator,
} from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { useClientForm } from "hooks/use-client-form.hook"
import { ScreenHeader } from "components/ScreenHeader"
import { PhoneInput } from "components/PhoneInput"
import { CountrySelector } from "components/CountrySelector"
import { useTenantTheme } from "contexts/tenant-theme.context"

function FormField({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <View className="mb-4">
      <Text className="text-zinc-700 font-bold text-sm mb-1.5">{label}</Text>
      {children}
      {!!error && <Text className="text-red-500 text-xs mt-1">{error}</Text>}
    </View>
  )
}

const inputClass = "bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base"

export function ClientFormScreen({ id }: { id?: string }) {
  const router = useRouter()
  const { form, setForm, errors, clearFieldError, countryCode, setCountryCode, isCreating, createClient } = useClientForm(id)
  const { primaryColor } = useTenantTheme()

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={["top"]}>
      <ScreenHeader title={id ? "Editar Cliente" : "Novo Cliente"} showBack onBack={() => router.back()} />
      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
          <View className="bg-white rounded-3xl border border-zinc-100 p-5">
            <Text className="text-base font-black text-zinc-900 mb-4">Dados do Cliente</Text>

            <FormField label="Nome *" error={errors.name}>
              <TextInput
                className={`${inputClass} ${errors.name ? "border-red-400" : ""}`}
                placeholder="Nome completo"
                placeholderTextColor="#a1a1aa"
                value={form.name}
                onChangeText={(v) => { setForm((p) => ({ ...p, name: v })); clearFieldError("name") }}
              />
            </FormField>

            <FormField label="Telefone *" error={errors.phone}>
              <View className="flex-row gap-2">
                <CountrySelector value={countryCode} onChange={setCountryCode} />
                <View className="flex-1">
                  <PhoneInput
                    value={form.phone}
                    countryCode={countryCode}
                    onChange={(v) => { setForm((p) => ({ ...p, phone: v })); clearFieldError("phone") }}
                  />
                </View>
              </View>
            </FormField>

            <FormField label="E-mail">
              <TextInput
                className={inputClass}
                placeholder="email@exemplo.com"
                placeholderTextColor="#a1a1aa"
                value={form.email}
                onChangeText={(v) => setForm((p) => ({ ...p, email: v }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </FormField>

            <FormField label="Observações">
              <TextInput
                className={`${inputClass} h-24`}
                placeholder="Anotações sobre o cliente..."
                placeholderTextColor="#a1a1aa"
                value={form.notes}
                onChangeText={(v) => setForm((p) => ({ ...p, notes: v }))}
                multiline
                textAlignVertical="top"
              />
            </FormField>
          </View>

          <Pressable
            onPress={createClient}
            disabled={isCreating}
            className="h-14 rounded-2xl items-center justify-center mt-4 shadow-sm"
            style={{ backgroundColor: isCreating ? primaryColor + "99" : primaryColor }}
          >
            {isCreating
              ? <ActivityIndicator color="white" />
              : <Text className="text-white font-black text-base">Salvar Cliente</Text>
            }
          </Pressable>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  )
}
