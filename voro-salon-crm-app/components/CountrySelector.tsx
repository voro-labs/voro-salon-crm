import React, { useState } from "react"
import {
  View, Text, Pressable, Modal, FlatList,
  Image, TextInput, SafeAreaView,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { flags } from "lib/flag-utils"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTenantTheme } from "contexts/tenant-theme.context"

const COUNTRIES = Object.entries(flags).map(([code, data]) => ({
  code,
  ...data,
}))

interface CountrySelectorProps {
  value: string
  onChange: (countryCode: string) => void
}

export function CountrySelector({ value, onChange }: CountrySelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const insets = useSafeAreaInsets()
  const { primaryColor } = useTenantTheme()

  const selected = flags[value] ?? flags["BR"]
  const filtered = search.trim()
    ? COUNTRIES.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.dialCode.includes(search)
      )
    : COUNTRIES

  function handleSelect(code: string) {
    onChange(code)
    setOpen(false)
    setSearch("")
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-2xl px-3 py-3 h-[50px]"
      >
        <Image
          source={{ uri: selected.flagUrl }}
          style={{ width: 24, height: 16, borderRadius: 2 }}
          resizeMode="cover"
        />
        <Text className="text-zinc-900 font-semibold text-base">{selected.dialCode}</Text>
        <Ionicons name="chevron-down" size={14} color="#71717a" />
      </Pressable>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-100">
            <Text className="text-lg font-black text-zinc-900">Selecionar País</Text>
            <Pressable onPress={() => { setOpen(false); setSearch("") }} className="h-9 w-9 bg-zinc-100 rounded-xl items-center justify-center">
              <Ionicons name="close" size={20} color="#71717a" />
            </Pressable>
          </View>

          {/* Search */}
          <View className="px-5 py-3 border-b border-zinc-100">
            <View className="bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-2 flex-row items-center gap-2">
              <Ionicons name="search" size={16} color="#a1a1aa" />
              <TextInput
                className="flex-1 text-zinc-900 font-medium text-sm py-1"
                placeholder="Buscar país..."
                placeholderTextColor="#a1a1aa"
                value={search}
                onChangeText={setSearch}
                autoFocus
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch("")}>
                  <Ionicons name="close-circle" size={16} color="#a1a1aa" />
                </Pressable>
              )}
            </View>
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            renderItem={({ item }) => {
              const isSelected = item.code === value
              return (
                <Pressable
                  onPress={() => handleSelect(item.code)}
                  className="flex-row items-center gap-3 px-5 py-3.5 border-b border-zinc-50 active:bg-zinc-50"
                  style={isSelected ? { backgroundColor: primaryColor + "15" } : undefined}
                >
                  <Image
                    source={{ uri: item.flagUrl }}
                    style={{ width: 28, height: 19, borderRadius: 3 }}
                    resizeMode="cover"
                  />
                  <Text className="flex-1 text-zinc-900 font-semibold text-base">{item.name}</Text>
                  <Text className="text-zinc-400 font-medium text-sm">{item.dialCode}</Text>
                  {isSelected && <Ionicons name="checkmark" size={18} color={primaryColor} />}
                </Pressable>
              )
            }}
          />
        </View>
      </Modal>
    </>
  )
}
