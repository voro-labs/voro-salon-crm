import React, { useState } from "react"
import { View, Text, Pressable, Modal, ScrollView } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"))
const MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"]

function parseTime(value: string): { hour: string; minute: string } {
  if (!value) return { hour: "08", minute: "00" }
  const [h, m] = value.split(":")
  const rawMin = m?.padStart(2, "0") ?? "00"
  const nearestMin = MINUTES.reduce((prev, curr) =>
    Math.abs(parseInt(curr) - parseInt(rawMin)) < Math.abs(parseInt(prev) - parseInt(rawMin)) ? curr : prev
  )
  return { hour: h?.padStart(2, "0") ?? "08", minute: nearestMin }
}

interface TimePickerInputProps {
  value: string
  onChange: (time: string) => void
  placeholder?: string
}

export function TimePickerInput({ value, onChange, placeholder = "Selecionar horário" }: TimePickerInputProps) {
  const insets = useSafeAreaInsets()
  const [open, setOpen] = useState(false)
  const [selHour, setSelHour] = useState(() => parseTime(value).hour)
  const [selMinute, setSelMinute] = useState(() => parseTime(value).minute)

  function handleOpen() {
    const { hour, minute } = parseTime(value)
    setSelHour(hour)
    setSelMinute(minute)
    setOpen(true)
  }

  function confirm() {
    onChange(`${selHour}:${selMinute}`)
    setOpen(false)
  }

  const hourRows = Array.from({ length: 6 }, (_, i) => HOURS.slice(i * 4, i * 4 + 4))
  const minuteRows = Array.from({ length: 3 }, (_, i) => MINUTES.slice(i * 4, i * 4 + 4))

  return (
    <>
      <Pressable
        onPress={handleOpen}
        className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 flex-row items-center gap-2"
      >
        <Ionicons name="time-outline" size={18} color="#71717a" />
        <Text className={`flex-1 font-semibold text-base ${value ? "text-zinc-900" : "text-zinc-400"}`}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={14} color="#a1a1aa" />
      </Pressable>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>

          <View className="flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-100">
            <Text className="text-lg font-black text-zinc-900">Selecionar Horário</Text>
            <Pressable onPress={() => setOpen(false)} className="h-9 w-9 bg-zinc-100 rounded-xl items-center justify-center">
              <Ionicons name="close" size={20} color="#71717a" />
            </Pressable>
          </View>

          <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
            <Text className="text-xs font-black text-zinc-400 tracking-widest mb-3">HORA</Text>
            {hourRows.map((row, ri) => (
              <View key={ri} className="flex-row mb-2">
                {row.map((h) => (
                  <View key={h} className="flex-1 items-center px-1">
                    <Pressable
                      onPress={() => setSelHour(h)}
                      className={`h-12 w-full rounded-2xl items-center justify-center
                        ${selHour === h ? "bg-purple-600" : "bg-zinc-50 border border-zinc-100 active:bg-zinc-100"}`}
                    >
                      <Text className={`text-base font-bold ${selHour === h ? "text-white" : "text-zinc-800"}`}>
                        {h}
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ))}

            <Text className="text-xs font-black text-zinc-400 tracking-widest mt-6 mb-3">MINUTO</Text>
            {minuteRows.map((row, ri) => (
              <View key={ri} className="flex-row mb-2">
                {row.map((m) => (
                  <View key={m} className="flex-1 items-center px-1">
                    <Pressable
                      onPress={() => setSelMinute(m)}
                      className={`h-12 w-full rounded-2xl items-center justify-center
                        ${selMinute === m ? "bg-purple-600" : "bg-zinc-50 border border-zinc-100 active:bg-zinc-100"}`}
                    >
                      <Text className={`text-base font-bold ${selMinute === m ? "text-white" : "text-zinc-800"}`}>
                        {m}
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>

          <View className="px-5 pb-8 pt-3 border-t border-zinc-100">
            <View className="flex-row items-center justify-center gap-1 mb-4">
              <Ionicons name="checkmark-circle" size={16} color="#7c3aed" />
              <Text className="text-purple-600 font-bold text-sm">
                {selHour}:{selMinute} selecionado
              </Text>
            </View>
            <Pressable
              onPress={confirm}
              className="h-14 bg-purple-600 rounded-2xl items-center justify-center shadow-sm shadow-purple-200"
            >
              <Text className="text-white font-black text-base">Confirmar</Text>
            </Pressable>
          </View>

        </View>
      </Modal>
    </>
  )
}
