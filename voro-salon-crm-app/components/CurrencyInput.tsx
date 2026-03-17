import React, { useState, useEffect } from "react"
import { TextInput, View, Text, TextInputProps } from "react-native"

interface CurrencyInputProps extends Omit<TextInputProps, "value" | "onChangeText" | "keyboardType"> {
  value: number
  onChange: (value: number) => void
  label?: string
}

function formatCurrency(cents: number): string {
  if (cents === 0) return ""
  const reais = (cents / 100).toFixed(2)
  const [intPart, decPart] = reais.split(".")
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return `${formattedInt},${decPart}`
}

function parseCents(raw: string): number {
  const digits = raw.replace(/\D/g, "")
  return parseInt(digits || "0", 10)
}

export function CurrencyInput({ value, onChange, label, ...rest }: CurrencyInputProps) {
  const [display, setDisplay] = useState("")

  useEffect(() => {
    const cents = Math.round(value * 100)
    setDisplay(cents > 0 ? formatCurrency(cents) : "")
  }, [value])

  function handleChange(text: string) {
    const cents = parseCents(text)
    const formatted = formatCurrency(cents)
    setDisplay(formatted)
    onChange(cents / 100)
  }

  return (
    <View className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 flex-row items-center gap-2">
      <Text className="text-zinc-400 font-semibold text-base">R$</Text>
      <TextInput
        className="flex-1 text-zinc-900 font-semibold text-base py-0"
        value={display}
        onChangeText={handleChange}
        placeholder="0,00"
        placeholderTextColor="#a1a1aa"
        keyboardType="numeric"
        {...rest}
      />
    </View>
  )
}
