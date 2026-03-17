import React, { useState } from "react"
import { View, Text, Pressable, Modal, FlatList, TextInput } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export interface SelectOption {
  id: string
  label: string
  subtitle?: string
}

interface SelectPickerInputProps {
  value: string
  onChange: (id: string) => void
  options: SelectOption[]
  placeholder?: string
  icon?: React.ComponentProps<typeof Ionicons>["name"]
  searchPlaceholder?: string
}

export function SelectPickerInput({
  value,
  onChange,
  options,
  placeholder = "Selecionar",
  icon = "chevron-down",
  searchPlaceholder = "Buscar...",
}: SelectPickerInputProps) {
  const insets = useSafeAreaInsets()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const selected = options.find((o) => o.id === value)
  const filtered = query
    ? options.filter((o) => `${o.label} ${o.subtitle ?? ""}`.toLowerCase().includes(query.toLowerCase()))
    : options

  function handleSelect(id: string) {
    onChange(id)
    setOpen(false)
    setQuery("")
  }

  function handleOpen() {
    setQuery("")
    setOpen(true)
  }

  return (
    <>
      <Pressable
        onPress={handleOpen}
        className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 flex-row items-center gap-2"
      >
        <Text className={`flex-1 font-semibold text-base ${selected ? "text-zinc-900" : "text-zinc-400"}`}>
          {selected ? selected.label : placeholder}
        </Text>
        {selected && selected.subtitle ? (
          <Text className="text-zinc-400 text-sm">{selected.subtitle}</Text>
        ) : null}
        <Ionicons name={icon} size={14} color="#a1a1aa" />
      </Pressable>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>

          <View className="flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-100">
            <Text className="text-lg font-black text-zinc-900">{placeholder}</Text>
            <Pressable onPress={() => setOpen(false)} className="h-9 w-9 bg-zinc-100 rounded-xl items-center justify-center">
              <Ionicons name="close" size={20} color="#71717a" />
            </Pressable>
          </View>

          <View className="px-5 py-3 border-b border-zinc-100">
            <View className="bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-2 flex-row items-center gap-2">
              <Ionicons name="search" size={16} color="#a1a1aa" />
              <TextInput
                className="flex-1 text-zinc-900 font-medium text-sm py-1"
                placeholder={searchPlaceholder}
                placeholderTextColor="#a1a1aa"
                value={query}
                onChangeText={setQuery}
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery("")}>
                  <Ionicons name="close-circle" size={16} color="#a1a1aa" />
                </Pressable>
              )}
            </View>
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelect(item.id)}
                className={`flex-row items-center px-4 py-3 rounded-2xl mb-2 border ${
                  item.id === value ? "bg-purple-50 border-purple-200" : "bg-white border-zinc-100 active:bg-zinc-50"
                }`}
              >
                <View className="flex-1">
                  <Text className={`font-bold text-base ${item.id === value ? "text-purple-700" : "text-zinc-900"}`}>
                    {item.label}
                  </Text>
                  {item.subtitle ? (
                    <Text className="text-zinc-400 text-sm mt-0.5">{item.subtitle}</Text>
                  ) : null}
                </View>
                {item.id === value && (
                  <Ionicons name="checkmark-circle" size={20} color="#7c3aed" />
                )}
              </Pressable>
            )}
            ListEmptyComponent={
              <View className="items-center py-12">
                <Ionicons name="search-outline" size={40} color="#d4d4d8" />
                <Text className="text-zinc-400 font-semibold mt-2">Nenhum resultado</Text>
              </View>
            }
          />
        </View>
      </Modal>
    </>
  )
}
