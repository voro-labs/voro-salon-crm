import React, { useState, useRef } from "react"
import { View, Text, Pressable, Modal, FlatList, ActivityIndicator } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTenantTheme } from "contexts/tenant-theme.context"

// Slots de 30 em 30 minutos — de 06:00 até 22:30
const ALL_TIME_SLOTS: string[] = []
for (let h = 6; h <= 22; h++) {
  ALL_TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`)
  if (h < 23) ALL_TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`)
}

function snapToSlot(value: string, slots: string[]): string {
  const list = slots.length > 0 ? slots : ALL_TIME_SLOTS
  if (!value) return list[0] ?? "08:00"
  const [h, m] = value.split(":").map(Number)
  const totalMin = h * 60 + (m ?? 0)
  return list.reduce((prev, curr) => {
    const [ph, pm] = prev.split(":").map(Number)
    const [ch, cm] = curr.split(":").map(Number)
    return Math.abs(ch * 60 + cm - totalMin) < Math.abs(ph * 60 + pm - totalMin) ? curr : prev
  })
}

interface TimePickerInputProps {
  value: string
  onChange: (time: string) => void
  placeholder?: string
  /** Quando fornecido, só exibe esses horários (slots disponíveis). Se vazio e loadingSlots=false, mostra mensagem de indisponível. */
  availableSlots?: string[]
  /** Indica que os slots estão sendo carregados */
  loadingSlots?: boolean
}

export function TimePickerInput({ value, onChange, placeholder = "Selecionar horário", availableSlots, loadingSlots = false }: TimePickerInputProps) {
  const insets = useSafeAreaInsets()
  const { primaryColor } = useTenantTheme()
  const [open, setOpen] = useState(false)
  const displaySlots = availableSlots !== undefined ? availableSlots : ALL_TIME_SLOTS
  const [selected, setSelected] = useState(() => snapToSlot(value, displaySlots))
  const listRef = useRef<FlatList>(null)

  function handleOpen() {
    if (loadingSlots) return
    const snapped = snapToSlot(value, displaySlots)
    setSelected(snapped)
    setOpen(true)
    // Rola para o item selecionado ao abrir
    const idx = displaySlots.indexOf(snapped)
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
        disabled={loadingSlots}
      >
        {loadingSlots ? (
          <ActivityIndicator size="small" color={primaryColor} />
        ) : (
          <Ionicons name="time-outline" size={18} color="#71717a" />
        )}
        <Text className={`flex-1 font-semibold text-base ${value ? "text-zinc-900" : "text-zinc-400"}`}>
          {loadingSlots ? "Carregando horários..." : (value || placeholder)}
        </Text>
        {!loadingSlots && <Ionicons name="chevron-down" size={14} color="#a1a1aa" />}
      </Pressable>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>

          <View className="flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-100">
            <Text className="text-lg font-black text-zinc-900">Selecionar Horário</Text>
            <Pressable onPress={() => setOpen(false)} className="h-9 w-9 bg-zinc-100 rounded-xl items-center justify-center">
              <Ionicons name="close" size={20} color="#71717a" />
            </Pressable>
          </View>

          {displaySlots.length === 0 ? (
            <View className="flex-1 items-center justify-center gap-2 px-8">
              <Ionicons name="calendar-outline" size={40} color="#d4d4d8" />
              <Text className="text-zinc-400 font-semibold text-base text-center">Nenhum horário disponível nesta data</Text>
              <Text className="text-zinc-400 text-sm text-center">Tente outra data ou verifique a agenda do profissional.</Text>
            </View>
          ) : (
          <FlatList
            ref={listRef}
            data={displaySlots}
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
          )}

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
