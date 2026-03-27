import React, { useState } from "react"
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, Modal } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter, useLocalSearchParams } from "expo-router"
import { useAppointmentDetail } from "hooks/use-appointment-detail.hook"
import { ScreenHeader } from "components/ScreenHeader"
import { useTenantTheme } from "contexts/tenant-theme.context"

const STATUS_OPTIONS = [
  { value: 0, label: "Pendente",   bg: "#fef9c3", text: "#854d0e", border: "#fef08a" },
  { value: 1, label: "Confirmado", bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  { value: 2, label: "Concluído",  bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" },
  { value: 3, label: "Cancelado",  bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
  { value: 4, label: "Faltou",     bg: "#f4f4f5", text: "#52525b", border: "#e4e4e7" },
]

const WEEKDAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"]
const MONTHS   = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]

function parseDt(iso?: string) {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return {
    day:     String(d.getDate()).padStart(2, "0"),
    month:   MONTHS[d.getMonth()],
    year:    String(d.getFullYear()),
    weekday: WEEKDAYS[d.getDay()],
    time:    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
  }
}

function fmtCurrency(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function InfoRow({
  icon, label, value, color = "#7c3aed",
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"]
  label: string
  value: string
  color?: string
}) {
  return (
    <View className="flex-row items-center gap-3 py-3 border-b border-zinc-50">
      <View className="h-9 w-9 rounded-xl items-center justify-center shrink-0" style={{ backgroundColor: color + "15" }}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View className="flex-1">
        <Text className="text-zinc-400 text-xs font-semibold mb-0.5">{label}</Text>
        <Text className="text-zinc-900 font-bold text-sm">{value}</Text>
      </View>
    </View>
  )
}

export default function AppointmentDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { appointment, isLoading, isSaving, isDeleting, updateStatus, deleteAppointment } = useAppointmentDetail(id)
  const { primaryColor } = useTenantTheme()

  const [statusModal, setStatusModal] = useState(false)

  const appt = appointment as any
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-50 items-center justify-center">
        <ActivityIndicator color={primaryColor} size="large" />
      </SafeAreaView>
    )
  }

  if (!appt) return null

  const dt        = parseDt(appt.scheduledDateTime)
  const status    = STATUS_OPTIONS[appt.status ?? 0] ?? STATUS_OPTIONS[0]
  const clientName = (appt.clientName ?? appt.client?.name ?? `${appt.client?.firstName ?? ""} ${appt.client?.lastName ?? ""}`.trim()) || "—"
  const serviceName = appt.serviceName ?? appt.service?.name ?? appt.description ?? "—"
  const employeeName = appt.employeeName ?? appt.employee?.name ?? `${appt.employee?.firstName ?? ""} ${appt.employee?.lastName ?? ""}`.trim()

  function confirmDelete() {
    Alert.alert(
      "Excluir agendamento?",
      "Essa ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: () => deleteAppointment() },
      ]
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <ScreenHeader
        title="Agendamento"
        showBack
        onBack={() => router.back()}
        right={
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => router.push(`/(tabs)/appointments/edit?id=${id}` as any)}
              className="h-9 w-9 rounded-xl items-center justify-center"
              style={{ backgroundColor: primaryColor + "15", borderWidth: 1, borderColor: primaryColor + "25" }}
            >
              <Ionicons name="create-outline" size={18} color={primaryColor} />
            </Pressable>
            <Pressable
              onPress={confirmDelete}
              disabled={isDeleting}
              className="h-9 w-9 bg-red-50 rounded-xl items-center justify-center border border-red-100"
            >
              {isDeleting
                ? <ActivityIndicator size="small" color="#dc2626" />
                : <Ionicons name="trash-outline" size={18} color="#dc2626" />
              }
            </Pressable>
          </View>
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Date / Time hero card */}
        {dt && (
          <View className="rounded-3xl p-5 flex-row items-center gap-4" style={{ backgroundColor: primaryColor }}>
            <View className="bg-white/20 rounded-2xl px-4 py-3 items-center min-w-[56px]">
              <Text className="text-white text-3xl font-black leading-tight">{dt.day}</Text>
              <Text className="text-xs font-bold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.7)" }}>{dt.month.slice(0, 3)}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-white font-black text-lg">{dt.weekday}</Text>
              <Text className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>{dt.month} de {dt.year}</Text>
              <View className="flex-row items-center gap-3 mt-2">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.8)" />
                  <Text className="text-white font-bold text-sm">{dt.time}</Text>
                </View>
                {appt.durationMinutes ? (
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="hourglass-outline" size={14} color="rgba(255,255,255,0.8)" />
                    <Text className="text-white font-bold text-sm">{appt.durationMinutes} min</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        )}

        {/* Status card — tappable */}
        <Pressable
          onPress={() => setStatusModal(true)}
          disabled={isSaving}
          className="bg-white rounded-2xl px-4 py-3 border border-zinc-100 flex-row items-center gap-3"
        >
          <View className="h-9 w-9 rounded-xl items-center justify-center shrink-0" style={{ backgroundColor: status.bg, borderWidth: 1, borderColor: status.border }}>
            <Ionicons name="flag-outline" size={16} color={status.text} />
          </View>
          <View className="flex-1">
            <Text className="text-zinc-400 text-xs font-semibold">Status</Text>
            <Text className="font-black text-sm" style={{ color: status.text }}>{status.label}</Text>
          </View>
          {isSaving
            ? <ActivityIndicator size="small" color="#a1a1aa" />
            : <Ionicons name="chevron-down" size={16} color="#a1a1aa" />
          }
        </Pressable>

        {/* Details card */}
        <View className="bg-white rounded-2xl px-4 border border-zinc-100">
          <InfoRow icon="person-outline"  label="Cliente"      value={clientName} color={primaryColor} />
          <InfoRow icon="cut-outline"     label="Serviço"      value={serviceName} color="#059669" />
          {appt.amount > 0 && (
            <InfoRow icon="wallet-outline" label="Valor"        value={fmtCurrency(appt.amount)} color="#d97706" />
          )}
          {employeeName ? (
            <InfoRow icon="person-circle-outline" label="Profissional" value={employeeName} color={primaryColor} />
          ) : null}
          {appt.description && appt.description !== serviceName ? (
            <InfoRow icon="document-text-outline" label="Descrição" value={appt.description} color="#52525b" />
          ) : null}
        </View>

        {/* Notes */}
        {appt.notes ? (
          <View className="bg-white rounded-2xl px-4 py-4 border border-zinc-100">
            <Text className="text-zinc-400 text-xs font-semibold mb-2">Observações</Text>
            <Text className="text-zinc-700 text-sm leading-relaxed">{appt.notes}</Text>
          </View>
        ) : null}

        {/* Edit button */}
        <Pressable
          onPress={() => router.push(`/(tabs)/appointments/edit?id=${id}` as any)}
          className="h-14 rounded-2xl items-center justify-center flex-row gap-2 mt-2"
          style={{ backgroundColor: primaryColor }}
        >
          <Ionicons name="create-outline" size={20} color="white" />
          <Text className="text-white font-black text-base">Editar Agendamento</Text>
        </Pressable>
      </ScrollView>

      {/* Status Modal */}
      <Modal visible={statusModal} transparent animationType="fade" onRequestClose={() => setStatusModal(false)}>
        <Pressable
          className="flex-1 bg-black/40 items-center justify-center px-8"
          onPress={() => setStatusModal(false)}
        >
          <Pressable className="bg-white rounded-3xl w-full overflow-hidden" onPress={(e) => e.stopPropagation()}>
            <View className="px-5 pt-5 pb-3 border-b border-zinc-100">
              <Text className="text-base font-black text-zinc-900">Alterar status</Text>
            </View>
            {STATUS_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => { updateStatus(opt.value); setStatusModal(false) }}
                className="flex-row items-center gap-3 px-5 py-4 active:bg-zinc-50"
              >
                <View className="h-3 w-3 rounded-2xl" style={{ backgroundColor: opt.text }} />
                <Text className="flex-1 text-zinc-900 font-semibold">{opt.label}</Text>
                {(appt.status ?? 0) === opt.value && (
                  <Ionicons name="checkmark" size={18} color={primaryColor} />
                )}
              </Pressable>
            ))}
            <View className="h-4" />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}
