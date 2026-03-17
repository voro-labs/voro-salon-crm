import React, { useState } from "react"
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { secureApiCall, API_CONFIG } from "lib/api"

export default function NewAppointmentScreen() {
  const router = useRouter()
  const [clientSearch, setClientSearch] = useState("")
  const [service, setService] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputClass = "bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base"

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await secureApiCall(API_CONFIG.ENDPOINTS.APPOINTMENTS, {
        method: "POST",
        body: JSON.stringify({ clientName: clientSearch, serviceName: service, date, startTime: time, notes }),
      })
      if (res.hasError) { setError(res.message ?? "Erro ao criar agendamento"); return }
      router.back()
    } catch { setError("Erro inesperado") }
    finally { setLoading(false) }
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <View className="bg-white px-5 pt-4 pb-4 border-b border-zinc-100 flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} className="h-9 w-9 bg-zinc-50 rounded-xl items-center justify-center border border-zinc-100">
            <Ionicons name="chevron-back" size={20} color="#18181b" />
          </Pressable>
          <Text className="text-xl font-black text-zinc-900">Novo Agendamento</Text>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
          {[
            { label: "Cliente", placeholder: "Nome do cliente", value: clientSearch, onChange: setClientSearch, icon: "person-outline" },
            { label: "Serviço", placeholder: "Serviço", value: service, onChange: setService, icon: "cut-outline" },
            { label: "Data", placeholder: "DD/MM/AAAA", value: date, onChange: setDate, icon: "calendar-outline" },
            { label: "Horário", placeholder: "HH:MM", value: time, onChange: setTime, icon: "time-outline" },
          ].map((field) => (
            <View key={field.label} className="mb-4">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">{field.label}</Text>
              <View className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 flex-row items-center gap-2">
                <Ionicons name={field.icon as any} size={18} color="#a1a1aa" />
                <TextInput className="flex-1 text-zinc-900 font-semibold text-base py-0" placeholder={field.placeholder} placeholderTextColor="#a1a1aa" value={field.value} onChangeText={field.onChange} />
              </View>
            </View>
          ))}

          <View className="mb-4">
            <Text className="text-zinc-700 font-bold text-sm mb-1.5">Observações</Text>
            <TextInput className={`${inputClass} h-24`} placeholder="Observações..." placeholderTextColor="#a1a1aa" value={notes} onChangeText={setNotes} multiline textAlignVertical="top" />
          </View>

          {error && <View className="bg-red-50 p-4 rounded-2xl mb-4 border border-red-100"><Text className="text-red-600 font-bold">{error}</Text></View>}

          <Pressable onPress={handleSave} disabled={loading} className={`h-14 rounded-2xl items-center justify-center ${loading ? "bg-purple-400" : "bg-purple-600"}`}>
            {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-base">Salvar Agendamento</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
