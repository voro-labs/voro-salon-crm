import React, { useState, useEffect } from "react"
import { View, Text, TextInput } from "react-native"
import { Ionicons } from "@expo/vector-icons"

interface DurationInputProps {
  value: number
  onChange: (minutes: number) => void
  placeholder?: string
}

export function DurationInput({ value, onChange, placeholder = "0" }: DurationInputProps) {
  const [display, setDisplay] = useState(value > 0 ? String(value) : "")

  useEffect(() => {
    setDisplay(value > 0 ? String(value) : "")
  }, [value])

  function handleChange(text: string) {
    const digits = text.replace(/\D/g, "")
    setDisplay(digits)
    onChange(digits ? parseInt(digits, 10) : 0)
  }

  return (
    <View className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 flex-row items-center gap-2">
      <Ionicons name="hourglass-outline" size={18} color="#71717a" />
      <TextInput
        className="flex-1 text-zinc-900 font-semibold text-base py-0"
        value={display}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor="#a1a1aa"
        keyboardType="numeric"
      />
      <Text className="text-zinc-400 font-semibold text-sm">min</Text>
    </View>
  )
}
