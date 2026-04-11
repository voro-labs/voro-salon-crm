import React, { useState, useEffect, useCallback } from "react"
import { View, Text, TextInput, Pressable, ActivityIndicator, Switch, InteractionManager } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import useSWR from "swr"
import { useAppointmentForm } from "hooks/use-appointment-form.hook"
import { DatePickerInput } from "components/DatePickerInput"
import { TimePickerInput } from "components/TimePickerInput"
import { CurrencyInput } from "components/CurrencyInput"
import { DurationInput } from "components/DurationInput"
import { SelectPickerInput } from "components/SelectPickerInput"
import { ScreenHeader } from "components/ScreenHeader"
import { formatPhone } from "@/lib/mask-utils"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { useAuth } from "contexts/auth.context"
import { API_CONFIG, secureApiCall } from "lib/api"
import { fetcher } from "lib/fetcher"
import * as FileSystem from "expo-file-system"
import * as Sharing from "expo-sharing"
import { mutate } from "swr"

export function AppointmentFormScreen({ id, rootPath = "/(tabs)" }: { id?: string; rootPath?: string }) {
  const router = useRouter()
  const { clients, services, employees, form, setForm, isLoading, isCreating, handleServiceChange, createAppointment, isModuleEnabled, activePromotion } = useAppointmentForm(id)
  const { primaryColor } = useTenantTheme()
  const { user } = useAuth()

  const isSalonEmployee = user?.roles?.some((r: any) => r.name === "SalonEmployee") ?? false
  const { data: myEmployee } = useSWR<any>(isSalonEmployee ? `${API_CONFIG.ENDPOINTS.EMPLOYEES}/me` : null, fetcher)

  const showClients = isModuleEnabled(1)
  const showServices = isModuleEnabled(3)
  const showEmployees = isModuleEnabled(4) && !isSalonEmployee

  // Block all editing when appointment is cancelled (status 3)
  const isCancelled = !!id && form.status === 3

  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [availableSlots, setAvailableSlots] = useState<string[] | undefined>(undefined)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [successModalOpen, setSuccessModalOpen] = useState(false)

  // Auto-set employee for SalonEmployee role
  useEffect(() => {
    if (myEmployee?.id && !id) {
      setForm((p) => ({ ...p, employeeId: myEmployee.id }))
    }
  }, [myEmployee?.id, id])

  // Sync internal date/time state with form if id is present
  useEffect(() => {
    if (id && form.scheduledDateTime) {
      const d = new Date(form.scheduledDateTime)
      if (!isNaN(d.getTime())) {
        setDate(form.scheduledDateTime.split("T")[0])
        setTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`)
      }
    }
  }, [id, form.scheduledDateTime])

  const handleSave = async () => {
    const success = await createAppointment(form)
    if (success) {
      mutate(API_CONFIG.ENDPOINTS.APPOINTMENTS)
      if (id) {
         router.back()
      } else {
         setSuccessModalOpen(true)
      }
    }
  }

  const exportIcs = async () => {
    try {
      const start = new Date(form.scheduledDateTime)
      const end = new Date(start.getTime() + (form.durationMinutes * 60000))

      const formatDateForIcs = (date: Date) => {
        return date.toISOString().replace(/[:-]/g, "").split(".")[0] + "Z"
      }

      const clientName = clients?.find((c: any) => c.id === form.clientId)?.name || "Cliente"
      const serviceName = form.serviceId !== "none" ? (services?.find((s: any) => s.id === form.serviceId)?.name || "Serviço") : "Serviço"
      
      const icsString = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Voro Salon CRM//PT",
        "BEGIN:VEVENT",
        `UID:${Date.now()}@voro`,
        `DTSTAMP:${formatDateForIcs(new Date())}`,
        `DTSTART:${formatDateForIcs(start)}`,
        `DTEND:${formatDateForIcs(end)}`,
        `SUMMARY:Agendamento: ${clientName} - ${serviceName}`,
        `DESCRIPTION:${form.description || ""}\\n\\n${form.notes || ""}`,
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\\r\\n")

      const fileUri = (FileSystem as any).documentDirectory + "voro-agendamento.ics"
      await FileSystem.writeAsStringAsync(fileUri, icsString, { encoding: "utf8" as any })
      
      const isAvailable = await Sharing.isAvailableAsync()
      if (isAvailable) {
        await Sharing.shareAsync(fileUri)
      }
    } catch {
      // Ignore if sharing fails
    }
  }

  const fetchAvailability = useCallback(async (d: string, serviceId: string, employeeId: string) => {
    if (!d) return
    setLoadingSlots(true)
    setAvailableSlots(undefined)
    if (!id) setTime("") // Only clear time on new appointments
    try {
      const params = new URLSearchParams({ date: d })
      if (serviceId && serviceId !== "none") params.set("serviceId", serviceId)
      if (employeeId && employeeId !== "none") params.set("employeeId", employeeId)
      // When editing, exclude the current appointment from conflict checks
      if (id) params.set("appointmentId", id)
      const res = await secureApiCall<any[]>(
        `${API_CONFIG.ENDPOINTS.APPOINTMENTS_AVAILABILITY}?${params.toString()}`,
        { method: "GET" }
      )
      if (!res.hasError && res.data) {
        const slots = res.data
          .filter((s: any) => s.isAvailable && !s.isBlocked)
          .map((s: any) => {
            const t = new Date(s.startTime)
            return `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`
          })
        setAvailableSlots(slots)
      } else {
        setAvailableSlots([])
      }
    } catch {
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }, [id])

  // Re-fetch quando data, serviço ou profissional mudam (exceto em encaixe)
  // Usar InteractionManager para não interromper a animação de transição de tela
  useEffect(() => {
    if (form.isEncaixe) {
      setAvailableSlots(undefined)
      return
    }
    if (date) {
      const task = InteractionManager.runAfterInteractions(() => {
        fetchAvailability(date, form.serviceId, form.employeeId)
      })
      return () => task.cancel()
    }
  }, [date, form.serviceId, form.employeeId, form.isEncaixe])

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
      <ScreenHeader title={id ? "Editar Agendamento" : "Novo Agendamento"} showBack onBack={() => router.back()} />

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={primaryColor} size="large" />
          </View>
        ) : (
          <KeyboardAwareScrollView className="flex-1" contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Cancelled banner */}
            {isCancelled && (
              <View className="flex-row items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 mb-4">
                <Ionicons name="ban-outline" size={18} color="#dc2626" />
                <Text className="text-red-700 text-sm font-semibold flex-1">
                  Agendamento cancelado. Edição bloqueada.
                </Text>
              </View>
            )}

            {/* Overlay to block all field interactions when cancelled */}
            {isCancelled && (
              <View
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, backgroundColor: "transparent" }}
                pointerEvents="box-only"
              />
            )}

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
                {activePromotion && (
                  <View className="mt-2 flex-row items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                    <Ionicons name="pricetag" size={15} color="#059669" />
                    <Text className="text-sm text-emerald-800 flex-1 flex-wrap">
                      Promoção aplicada:{" "}
                      <Text className="line-through text-emerald-600/70">
                        {activePromotion.originalPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </Text>
                      {"  "}
                      <Text className="font-black">
                        {activePromotion.promotionalPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </Text>
                    </Text>
                  </View>
                )}
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
                <TimePickerInput
                  value={time}
                  onChange={handleTimeChange}
                  availableSlots={form.isEncaixe ? undefined : availableSlots}
                  loadingSlots={!form.isEncaixe && loadingSlots}
                />
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
              onPress={handleSave}
              disabled={isCreating || !!isCancelled}
              className="h-14 rounded-2xl items-center justify-center"
              style={{ backgroundColor: isCancelled ? "#d4d4d8" : isCreating ? primaryColor + "99" : primaryColor }}
            >
              {isCreating ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-base">Salvar Agendamento</Text>}
            </Pressable>

          </KeyboardAwareScrollView>
        )}

      {/* SUCCESS MODAL */}
      {successModalOpen && (
        <View className="absolute inset-0 bg-white z-50 flex-1 items-center justify-center px-6">
          <View className="h-24 w-24 rounded-full bg-green-100 items-center justify-center mb-6">
            <Ionicons name="checkmark-circle" size={48} color="#16a34a" />
          </View>
          <Text className="text-2xl font-black text-zinc-900 text-center mb-2">
            Agendamento Criado!
          </Text>
          <Text className="text-zinc-600 text-center font-medium mb-10 px-4">
            Você pode adicionar este evento diretamente ao seu calendário para não esquecer.
          </Text>

          <View className="w-full gap-3">
            <Pressable
              onPress={exportIcs}
              className="h-14 rounded-2xl items-center justify-center flex-row bg-slate-900 w-full px-4 gap-2 active:bg-slate-800"
            >
              <Ionicons name="calendar-outline" size={20} color="white" />
              <Text className="text-white font-bold text-center">Exportar para o Calendário (.ics)</Text>
            </Pressable>

            <Pressable
              onPress={() => router.replace(`${rootPath}/appointments` as any)}
              className="h-14 mt-2 rounded-2xl items-center justify-center flex-row w-full border border-zinc-200 bg-white"
            >
              <Text className="text-zinc-900 font-bold">Voltar para a Agenda</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}
