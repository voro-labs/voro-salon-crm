import React, { useState, useEffect } from "react"
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter, useLocalSearchParams } from "expo-router"
import { useAppointmentDetail } from "hooks/use-appointment-detail.hook"
import { DatePickerInput } from "components/DatePickerInput"
import { TimePickerInput } from "components/TimePickerInput"
import { CurrencyInput } from "components/CurrencyInput"
import { DurationInput } from "components/DurationInput"
import { SelectPickerInput } from "components/SelectPickerInput"
import { formatPhone } from "@/lib/mask-utils"
import { useTenantTheme } from "contexts/tenant-theme.context"

export default function EditAppointmentScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const {
    clients, services, employees,
    form, setForm, isLoading, isSaving,
    handleServiceChange, updateAppointment, isModuleEnabled,
  } = useAppointmentDetail(id)
  const { primaryColor } = useTenantTheme()

  const showClients = isModuleEnabled(1)
  const showServices = isModuleEnabled(3)
  const showEmployees = isModuleEnabled(4)

  // Split scheduledDateTime into date and time for the pickers
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")

  useEffect(() => {
    if (form.scheduledDateTime) {
      const [d, t] = form.scheduledDateTime.split("T")
      setDate(d ?? "")
      setTime(t?.slice(0, 5) ?? "")
    }
  }, [form.scheduledDateTime])

  function handleDateChange(d: string) {
    setDate(d)
    const t = time || "08:00"
    setForm((p) => ({ ...p, scheduledDateTime: `${d}T${t}:00` }))
  }

  function handleTimeChange(t: string) {
    setTime(t)
    if (date) {
      setForm((p) => ({ ...p, scheduledDateTime: `${date}T${t}:00` }))
    }
  }

  const clientOptions = (clients ?? []).map((c: any) => ({
    id: c.id,
    label: c.name ?? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim(),
    subtitle: formatPhone(c.phone) ?? c.email ?? undefined,
  }))

  const serviceOptions = [
    { id: "none", label: "Sem serviço específico" },
    ...(services ?? []).map((s: any) => ({
      id: s.id,
      label: s.name,
      subtitle: s.price != null ? `R$ ${s.price.toFixed(2)}` : undefined,
    })),
  ]

  const employeeOptions = [
    { id: "none", label: "Sem profissional específico" },
    ...(employees ?? []).map((e: any) => ({
      id: e.id,
      label: e.name ?? `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim(),
    })),
  ]

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

        {/* Header */}
        <View className="bg-white px-5 pt-4 p-4 pb-4 border-b border-zinc-100 flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="h-9 w-9 bg-zinc-50 rounded-xl items-center justify-center border border-zinc-100"
          >
            <Ionicons name="chevron-back" size={20} color="#18181b" />
          </Pressable>
          <Text className="flex-1 text-xl font-black text-zinc-900">Editar Agendamento</Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Cliente */}
          {showClients && (
            <View className="mb-4">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Cliente *</Text>
              <SelectPickerInput
                value={form.clientId}
                onChange={(id) => setForm((p) => ({ ...p, clientId: id }))}
                options={clientOptions}
                placeholder="Selecionar cliente"
                searchPlaceholder="Buscar cliente..."
              />
            </View>
          )}

          {/* Serviço */}
          {showServices && (
            <View className="mb-4">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Serviço</Text>
              <SelectPickerInput
                value={form.serviceId}
                onChange={handleServiceChange}
                options={serviceOptions}
                placeholder="Selecionar serviço"
                searchPlaceholder="Buscar serviço..."
              />
            </View>
          )}

          {/* Profissional */}
          {showEmployees && (
            <View className="mb-4">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Profissional</Text>
              <SelectPickerInput
                value={form.employeeId}
                onChange={(id) => setForm((p) => ({ ...p, employeeId: id }))}
                options={employeeOptions}
                placeholder="Selecionar profissional"
                searchPlaceholder="Buscar profissional..."
              />
            </View>
          )}

          {/* Data + Horário */}
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Data *</Text>
              <DatePickerInput value={date} onChange={handleDateChange} />
            </View>
            <View className="flex-1">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Horário *</Text>
              <TimePickerInput value={time} onChange={handleTimeChange} />
            </View>
          </View>

          {/* Duração + Valor */}
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Duração</Text>
              <DurationInput
                value={form.durationMinutes}
                onChange={(v) => setForm((p) => ({ ...p, durationMinutes: v }))}
              />
            </View>
            <View className="flex-1">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Valor</Text>
              <CurrencyInput
                value={form.amount}
                onChange={(v) => setForm((p) => ({ ...p, amount: v }))}
              />
            </View>
          </View>

          {/* Descrição */}
          <View className="mb-4">
            <Text className="text-zinc-700 font-bold text-sm mb-1.5">Descrição</Text>
            <TextInput
              className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base"
              placeholder="Descrição do serviço"
              placeholderTextColor="#a1a1aa"
              value={form.description}
              onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
            />
          </View>

          {/* Observações */}
          <View className="mb-6">
            <Text className="text-zinc-700 font-bold text-sm mb-1.5">Observações</Text>
            <TextInput
              className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base h-24"
              placeholder="Observações..."
              placeholderTextColor="#a1a1aa"
              value={form.notes}
              onChangeText={(v) => setForm((p) => ({ ...p, notes: v }))}
              multiline
              textAlignVertical="top"
            />
          </View>

          <Pressable
            onPress={() => updateAppointment(form)}
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
