import React, { useState, useRef } from "react"
import { View, Text, Pressable, Modal, FlatList } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTenantTheme } from "contexts/tenant-theme.context"

// Slots de 30 em 30 minutos — de 06:00 até 22:30
const TIME_SLOTS: string[] = []
for (let h = 6; h <= 22; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`)
  if (h < 23) TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`)
}

function snapToSlot(value: string): string {
  if (!value) return "08:00"
  const [h, m] = value.split(":").map(Number)
  const totalMin = h * 60 + (m ?? 0)
  return TIME_SLOTS.reduce((prev, curr) => {
    const [ph, pm] = prev.split(":").map(Number)
    const [ch, cm] = curr.split(":").map(Number)
    return Math.abs(ch * 60 + cm - totalMin) < Math.abs(ph * 60 + pm - totalMin) ? curr : prev
  })
}

interface TimePickerInputProps {
  value: string
  onChange: (time: string) => void
  placeholder?: string
}

export function TimePickerInput({ value, onChange, placeholder = "Selecionar horário" }: TimePickerInputProps) {
  const insets = useSafeAreaInsets()
  const { primaryColor } = useTenantTheme()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(() => snapToSlot(value))
  const listRef = useRef<FlatList>(null)

  function handleOpen() {
    const snapped = snapToSlot(value)
    setSelected(snapped)
    setOpen(true)
    // Rola para o item selecionado ao abrir
    const idx = TIME_SLOTS.indexOf(snapped)
    if (idx > 0) {
      setTimeout(() => listRef.current?.scrollToIndex({ index: idx, viewPosition: 0.3 }), 100)
    }
  }

  function confirm() {
    onChange(selected)
    setOpen(false)
  }

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

          <FlatList
            ref={listRef}
            data={TIME_SLOTS}
            keyExtractor={(item) => item}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 8, paddingHorizontal: 16, paddingBottom: insets.bottom + 16 }}
            onScrollToIndexFailed={() => {}}
            renderItem={({ item }) => {
              const isSelected = item === selected
              return (
                <Pressable
                  onPress={() => setSelected(item)}
                  className="flex-row items-center justify-between px-4 py-3.5 rounded-2xl mb-1.5"
                  style={isSelected
                    ? { backgroundColor: primaryColor }
                    : { backgroundColor: "#fafafa", borderWidth: 1, borderColor: "#f4f4f5" }}
                >
                  <View className="flex-row items-center gap-3">
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={isSelected ? "white" : "#71717a"}
                    />
                    <Text className={`text-base font-bold ${isSelected ? "text-white" : "text-zinc-800"}`}>
                      {item}
                    </Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark" size={18} color="white" />}
                </Pressable>
              )
            }}
          />

          <View className="px-5 pb-8 pt-3 border-t border-zinc-100">
            <View className="flex-row items-center justify-center gap-1 mb-4">
              <Ionicons name="checkmark-circle" size={16} color={primaryColor} />
              <Text className="font-bold text-sm" style={{ color: primaryColor }}>
                {selected} selecionado
              </Text>
            </View>
            <Pressable
              onPress={confirm}
              className="h-14 rounded-2xl items-center justify-center"
              style={{ backgroundColor: primaryColor }}
            >
              <Text className="text-white font-black text-base">Confirmar</Text>
            </Pressable>
          </View>

        </View>
      </Modal>
    </>
  )
}
