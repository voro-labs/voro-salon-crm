import React, { useState, useEffect } from "react"
import { TextInput, View, TextInputProps } from "react-native"
import { applyMask, removeMask, phoneMasks } from "lib/mask-utils"

interface PhoneInputProps extends Omit<TextInputProps, "value" | "onChangeText" | "onChange"> {
  value: string
  countryCode?: string
  onChange: (rawNumbers: string) => void
}

export function PhoneInput({ value, countryCode = "BR", onChange, ...rest }: PhoneInputProps) {
  const mask = phoneMasks[countryCode]
  const [maskedValue, setMaskedValue] = useState("")

  useEffect(() => {
    if (mask && value) {
      setMaskedValue(applyMask(value, mask.mask))
    } else {
      setMaskedValue(value)
    }
  }, [value, countryCode])

  function handleChange(text: string) {
    if (mask) {
      const masked = applyMask(text, mask.mask)
      setMaskedValue(masked)
      onChange(removeMask(masked))
    } else {
      setMaskedValue(text)
      onChange(text)
    }
  }

  return (
    <View className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 flex-row items-center">
      <TextInput
        className="flex-1 text-zinc-900 font-semibold text-base py-0"
        value={maskedValue}
        onChangeText={handleChange}
        placeholder={mask?.placeholder ?? "Número do telefone"}
        placeholderTextColor="#a1a1aa"
        keyboardType="phone-pad"
        {...rest}
      />
    </View>
  )
}
