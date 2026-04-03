import React from "react"
import {
  View, Text, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Switch,
} from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useEmployeeDetail } from "hooks/use-employee-detail.hook"
import { ScreenHeader } from "components/ScreenHeader"
import { DatePickerInput } from "components/DatePickerInput"
import { ImagePickerInput } from "components/ImagePickerInput"
import { useTenantTheme } from "contexts/tenant-theme.context"

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="text-zinc-700 font-bold text-sm mb-1.5">{label}</Text>
      {children}
    </View>
  )
}

const inputClass = "bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base"

export function EmployeeFormScreen({ id }: { id?: string }) {
  const router = useRouter()
  const { form, setForm, isSaving, saveEmployee, toggleSpecialty, services, handlePhotoUpload, isUploadingPhoto, isLoading } = useEmployeeDetail(id)
  const { primaryColor } = useTenantTheme()

  if (id && isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-50 items-center justify-center">
        <ActivityIndicator color={primaryColor} size="large" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={["top"]}>
      <ScreenHeader title={id ? "Editar Funcionário" : "Novo Funcionário"} showBack onBack={() => router.back()} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Dados principais */}
          <View className="bg-white rounded-3xl border border-zinc-100 p-5 mb-4">
            <Text className="text-base font-black text-zinc-900 mb-5">Dados do Funcionário</Text>

            <View className="mb-6 items-center">
              <ImagePickerInput
                value={form.photoUrl}
                onChange={handlePhotoUpload}
                isUploading={isUploadingPhoto}
                label="Adicionar Foto"
                fallbackIcon="person-outline"
                rounded="full"
                size={96}
              />
            </View>

            <FormField label="Nome *">
              <TextInput
                className={inputClass}
                placeholder="Nome completo"
                placeholderTextColor="#a1a1aa"
                value={form.name}
                onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
                autoCapitalize="words"
              />
            </FormField>

            <FormField label="Data de Contratação">
              <DatePickerInput
                value={form.hireDate}
                onChange={(v) => setForm((p) => ({ ...p, hireDate: v }))}
              />
            </FormField>

            <FormField label="Comissão (%)">
              <TextInput
                className={inputClass}
                placeholder="Ex: 10 (opcional)"
                placeholderTextColor="#a1a1aa"
                value={form.commissionPercentage != null ? String(form.commissionPercentage) : ""}
                onChangeText={(v) => {
                  const num = parseFloat(v.replace(",", "."))
                  setForm((p) => ({ ...p, commissionPercentage: isNaN(num) ? undefined : num }))
                }}
                keyboardType="decimal-pad"
              />
            </FormField>

            <View className="flex-row items-center justify-between py-2">
              <View>
                <Text className="text-zinc-700 font-bold text-sm">Funcionário Ativo</Text>
                <Text className="text-zinc-400 text-xs mt-0.5">Aparece nos agendamentos</Text>
              </View>
              <Switch
                value={form.isActive}
                onValueChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
                trackColor={{ false: "#e4e4e7", true: primaryColor + "60" }}
                thumbColor={form.isActive ? primaryColor : "#a1a1aa"}
              />
            </View>
          </View>

          {/* Especialidades */}
          {(services as any[])?.length > 0 && (
            <View className="bg-white rounded-3xl border border-zinc-100 p-5 mb-4">
              <Text className="text-base font-black text-zinc-900 mb-1">Especialidades</Text>
              <Text className="text-zinc-400 text-xs mb-4">Selecione os serviços que este funcionário realiza</Text>

              <View className="gap-2">
                {(services as any[]).map((service) => {
                  const selected = form.specialtyIds.includes(service.id)
                  return (
                    <Pressable
                      key={service.id}
                      onPress={() => toggleSpecialty(service.id)}
                      className="flex-row items-center gap-3 p-3 rounded-2xl border"
                      style={{
                        borderColor: selected ? primaryColor + "40" : "#e4e4e7",
                        backgroundColor: selected ? primaryColor + "08" : "#fafafa",
                      }}
                    >
                      <View
                        className="h-5 w-5 rounded-md items-center justify-center"
                        style={{
                          backgroundColor: selected ? primaryColor : "transparent",
                          borderWidth: selected ? 0 : 1.5,
                          borderColor: "#d4d4d8",
                        }}
                      >
                        {selected && <Ionicons name="checkmark" size={13} color="white" />}
                      </View>
                      <Text
                        className="flex-1 text-sm font-semibold"
                        style={{ color: selected ? primaryColor : "#52525b" }}
                        numberOfLines={1}
                      >
                        {service.name}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>
          )}

          <Pressable
            onPress={() => saveEmployee(form)}
            disabled={isSaving}
            className="h-14 rounded-2xl items-center justify-center shadow-sm"
            style={{ backgroundColor: isSaving ? primaryColor + "99" : primaryColor }}
          >
            {isSaving
              ? <ActivityIndicator color="white" />
              : <Text className="text-white font-black text-base">Salvar Funcionário</Text>
            }
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
