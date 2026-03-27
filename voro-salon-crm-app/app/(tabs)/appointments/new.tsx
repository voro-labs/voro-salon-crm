import React, { useState } from "react"
import { View, Text, TextInput, Pressable, ActivityIndicator, Switch } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { useRouter } from "expo-router"
import { useAppointmentForm } from "hooks/use-appointment-form.hook"
import { DatePickerInput } from "components/DatePickerInput"
import { TimePickerInput } from "components/TimePickerInput"
import { CurrencyInput } from "components/CurrencyInput"
import { DurationInput } from "components/DurationInput"
import { SelectPickerInput } from "components/SelectPickerInput"
import { ScreenHeader } from "components/ScreenHeader"
import { formatPhone } from "@/lib/mask-utils"
import { useTenantTheme } from "contexts/tenant-theme.context"

export default function NewAppointmentScreen() {
  const router = useRouter()
  const { clients, services, employees, form, setForm, isLoading, isCreating, handleServiceChange, createAppointment, isModuleEnabled } = useAppointmentForm()
  const { primaryColor } = useTenantTheme()

  const showClients = isModuleEnabled(1)
  const showServices = isModuleEnabled(3)
  const showEmployees = isModuleEnabled(4)

  const [date, setDate] = useState("")
  const [time, setTime] = useState("")

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

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={["bottom"]}>
      <ScreenHeader title="Novo Agendamento" showBack onBack={() => router.back()} />

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={primaryColor} size="large" />
          </View>
        ) : (
          <KeyboardAwareScrollView className="flex-1" contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

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

            <View className="mb-4">
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

            <View className="flex-row items-center justify-between bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 mb-6">
              <View>
                <Text className="text-zinc-700 font-bold text-sm">Encaixe</Text>
                <Text className="text-zinc-400 text-xs mt-0.5">Atendimento sem hora marcada</Text>
              </View>
              <Switch
                value={form.isEncaixe ?? false}
                onValueChange={(v) => setForm((p) => ({ ...p, isEncaixe: v }))}
                trackColor={{ false: "#e4e4e7", true: primaryColor + "80" }}
                thumbColor={form.isEncaixe ? primaryColor : "#a1a1aa"}
              />
            </View>

            <Pressable
              onPress={() => createAppointment(form)}
              disabled={isCreating}
              className="h-14 rounded-2xl items-center justify-center"
              style={{ backgroundColor: isCreating ? primaryColor + "99" : primaryColor }}
            >
              {isCreating ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-base">Salvar Agendamento</Text>}
            </Pressable>

          </KeyboardAwareScrollView>
        )}
    </SafeAreaView>
  )
}
