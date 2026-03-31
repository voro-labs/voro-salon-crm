import React, { useState } from "react"
import { View, Text, Pressable, Modal, FlatList, TouchableWithoutFeedback } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTenantTheme } from "contexts/tenant-theme.context"

interface DurationInputProps {
  value: number
  onChange: (minutes: number) => void
  placeholder?: string
}

const DURATIONS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 hora", value: 60 },
  { label: "1 hora 30 min", value: 90 },
  { label: "2 horas", value: 120 },
  { label: "2 horas 30 min", value: 150 },
  { label: "3 horas", value: 180 },
]

export function DurationInput({ value, onChange, placeholder = "Selecionar duração" }: DurationInputProps) {
  const { primaryColor } = useTenantTheme()
  const [modalVisible, setModalVisible] = useState(false)

  const selectedLabel = DURATIONS.find(d => d.value === value)?.label || (value > 0 ? `${value} min` : placeholder)

  function handleSelect(min: number) {
    onChange(min)
    setModalVisible(false)
  }

  return (
    <View>
      <Pressable
        onPress={() => setModalVisible(true)}
        className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 flex-row items-center gap-2 active:bg-zinc-100"
      >
        <Ionicons name="hourglass-outline" size={18} color="#71717a" />
        <Text className={`flex-1 font-semibold text-base ${value > 0 ? "text-zinc-900" : "text-zinc-400"}`}>
          {selectedLabel}
        </Text>
        <Ionicons name="chevron-down" size={14} color="#a1a1aa" />
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View className="flex-1 bg-black/40 justify-end">
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-t-[32px] p-6 pb-10">
                <View className="flex-row items-center justify-between mb-6">
                  <Text className="text-xl font-black text-zinc-900">Duração do Serviço</Text>
                  <Pressable 
                    onPress={() => setModalVisible(false)}
                    className="h-8 w-8 bg-zinc-100 rounded-full items-center justify-center"
                  >
                    <Ionicons name="close" size={18} color="#71717a" />
                  </Pressable>
                </View>

                <FlatList
                  data={DURATIONS}
                  keyExtractor={(item) => item.value.toString()}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => {
                    const isSelected = item.value === value
                    return (
                      <Pressable
                        onPress={() => handleSelect(item.value)}
                        className={`flex-row items-center justify-between py-4 border-b border-zinc-50 ${isSelected ? "bg-zinc-50 px-3 rounded-xl" : ""}`}
                      >
                        <Text className={`text-base font-bold ${isSelected ? "text-zinc-900" : "text-zinc-500"}`}>
                          {item.label}
                        </Text>
                        {isSelected && <Ionicons name="checkmark-circle" size={20} color={primaryColor} />}
                      </Pressable>
                    )
                  }}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  )
}
