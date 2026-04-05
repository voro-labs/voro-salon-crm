import React, { useState } from "react"
import {
  View, Text, ScrollView, Pressable, ActivityIndicator, Alert, Modal, TextInput
} from "react-native"
import { ConfirmModal } from "components/ConfirmModal"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import useSWR from "swr"
import { API_CONFIG, secureApiCall } from "lib/api"
import { fetcher } from "lib/fetcher"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { ScreenHeader } from "components/ScreenHeader"
import { DatePickerInput } from "components/DatePickerInput"
import { TimePickerInput } from "components/TimePickerInput"
import { SelectPickerInput } from "components/SelectPickerInput"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"

export function BlockedHoursScreen() {
  const router = useRouter()
  const { primaryColor } = useTenantTheme()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [date, setDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [reason, setReason] = useState("")
  const [clientMessage, setClientMessage] = useState("")
  const [employeeId, setEmployeeId] = useState<string>("none")

  const { data: blocks, isLoading, mutate } = useSWR<any[]>(
    API_CONFIG.ENDPOINTS.TIME_SLOT_BLOCKS,
    fetcher
  )

  const { data: employees } = useSWR<any[]>(
    API_CONFIG.ENDPOINTS.EMPLOYEES,
    fetcher
  )

  const employeeOptions = [
    { id: "none", label: "Todos os profissionais (Salão fechado)" },
    ...(employees ?? []).map((e: any) => ({
      id: e.id,
      label: e.name ?? `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim(),
    })),
  ]

  const handleDelete = (id: string) => {
    setDeletingId(id)
  }

  const executeDelete = async () => {
    if (!deletingId) return
    const id = deletingId
    setDeletingId(null)
    try {
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.TIME_SLOT_BLOCKS}/${id}`, { method: "DELETE" })
      if (res.hasError) throw new Error(res.message || "Erro")
      mutate()
    } catch (e: any) {
      Alert.alert("Erro", e.message || "Não foi possível remover o bloqueio.")
    }
  }

  const handleSave = async () => {
    if (!date || !startTime || !endTime) {
      Alert.alert("Atenção", "Preencha a data e o intervalo de horário.")
      return
    }

    setIsSaving(true)
    try {
      const startDateTime = `${date}T${startTime}:00`
      const endDateTime = `${date}T${endTime}:00`

      const payload = {
        startDateTime,
        endDateTime,
        reason,
        clientMessage,
        employeeId: employeeId !== "none" ? employeeId : null,
      }

      const res = await secureApiCall(API_CONFIG.ENDPOINTS.TIME_SLOT_BLOCKS, {
        method: "POST",
        body: JSON.stringify(payload),
      })

      if (res.hasError) throw new Error(res.message || "Erro")
      
      setIsModalOpen(false)
      setDate("")
      setStartTime("")
      setEndTime("")
      setReason("")
      setClientMessage("")
      setEmployeeId("none")
      mutate()
    } catch (e: any) {
      Alert.alert("Erro", e.message || "Não foi possível criar o bloqueio.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={["top", "bottom"]}>
      <ScreenHeader title="Horários Bloqueados" showBack onBack={() => router.back()} />

      <View className="px-4 py-3 flex-row items-center justify-between border-b border-zinc-100 bg-white shadow-sm z-10">
        <Text className="text-zinc-500 text-sm font-medium">Controle de indisponibilidade</Text>
        <Pressable
          onPress={() => setIsModalOpen(true)}
          className="flex-row items-center justify-center gap-1.5 px-3 py-2 rounded-xl"
          style={{ backgroundColor: primaryColor }}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text className="text-white font-bold text-sm">Novo Bloqueio</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {isLoading ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color={primaryColor} />
          </View>
        ) : !blocks || blocks.length === 0 ? (
          <View className="py-20 items-center justify-center gap-3">
            <View className="h-16 w-16 bg-zinc-100 rounded-full items-center justify-center">
              <Ionicons name="calendar-outline" size={32} color="#a1a1aa" />
            </View>
            <Text className="text-zinc-400 font-semibold mt-2">Nenhum bloqueio ativo.</Text>
          </View>
        ) : (
          <View className="gap-3">
            {blocks.map((block) => {
              const start = new Date(block.startDateTime)
              const end = new Date(block.endDateTime)
              const day = start.toLocaleDateString("pt-BR")
              const startTimeStr = start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
              const endTimeStr = end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

              return (
                <View key={block.id} className="bg-white border border-zinc-100 rounded-2xl p-4 flex-row items-center gap-4">
                  <View className="h-12 w-12 bg-red-50 rounded-2xl items-center justify-center">
                    <Ionicons name="lock-closed" size={20} color="#ef4444" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-black text-zinc-900">{day} • {startTimeStr} às {endTimeStr}</Text>
                    <Text className="text-xs text-zinc-500 font-medium mt-0.5" numberOfLines={1}>
                      {block.reason || "Sem motivo registrado"}
                    </Text>
                    {block.employeeId && (
                      <View className="mt-1 flex-row items-center gap-1">
                        <Ionicons name="person" size={10} color="#a1a1aa" />
                        <Text className="text-[10px] text-zinc-400 font-bold uppercase">
                          {employees?.find(e => e.id === block.employeeId)?.name || "Profissional"}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Pressable onPress={() => handleDelete(block.id)} className="p-2 bg-zinc-50 rounded-xl">
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </Pressable>
                </View>
              )
            })}
          </View>
        )}
      </ScrollView>

      <ConfirmModal
        visible={!!deletingId}
        title="Remover bloqueio?"
        message="Este horário bloqueado será removido permanentemente."
        confirmLabel="Remover"
        destructive
        onConfirm={executeDelete}
        onCancel={() => setDeletingId(null)}
      />

      {/* Modal Novo Bloqueio */}
      <Modal visible={isModalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsModalOpen(false)}>
        <View className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-5 pt-6 pb-4 border-b border-zinc-100">
            <View className="flex-row items-center gap-2">
              <Ionicons name="lock-closed" size={20} color={primaryColor} />
              <Text className="text-lg font-black text-zinc-900">Novo Bloqueio</Text>
            </View>
            <Pressable onPress={() => setIsModalOpen(false)} className="h-9 w-9 bg-zinc-100 rounded-xl items-center justify-center">
              <Ionicons name="close" size={20} color="#71717a" />
            </Pressable>
          </View>

          <KeyboardAwareScrollView className="flex-1 px-5 py-4" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            
            <View className="mb-4">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Profissional (Opcional)</Text>
              <SelectPickerInput
                value={employeeId}
                onChange={setEmployeeId}
                options={employeeOptions}
                placeholder="Selecionar profissional"
              />
            </View>

            <View className="mb-4">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Data do Bloqueio *</Text>
              <DatePickerInput value={date} onChange={setDate} />
            </View>

            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-zinc-700 font-bold text-sm mb-1.5">Hora Ínicio *</Text>
                <TimePickerInput value={startTime} onChange={setStartTime} />
              </View>
              <View className="flex-1">
                <Text className="text-zinc-700 font-bold text-sm mb-1.5">Hora Fim *</Text>
                <TimePickerInput value={endTime} onChange={setEndTime} />
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Motivo Interno</Text>
              <TextInput
                className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base"
                placeholder="Ex: Feriado, manutenção..."
                placeholderTextColor="#a1a1aa"
                value={reason}
                onChangeText={setReason}
              />
            </View>

            <View className="mb-5">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Mensagem ao Cliente (Portal)</Text>
              <TextInput
                className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base"
                placeholder="O que o cliente vai ver se tentar agendar..."
                placeholderTextColor="#a1a1aa"
                value={clientMessage}
                onChangeText={setClientMessage}
                multiline
                style={{ height: 80, textAlignVertical: "top" }}
              />
            </View>

          </KeyboardAwareScrollView>

          <View className="px-5 pb-8 pt-3 border-t border-zinc-100">
            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              className="h-14 rounded-2xl items-center justify-center flex-row gap-2"
              style={{ backgroundColor: isSaving ? primaryColor + "99" : primaryColor }}
            >
              {isSaving ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-base">Salvar Bloqueio</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
