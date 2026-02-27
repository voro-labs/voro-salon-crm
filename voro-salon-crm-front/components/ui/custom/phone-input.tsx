"use client"

import { applyMask, phoneMasks, removeMask } from "@/lib/mask-utils"
import type React from "react"

import { useState, useEffect } from "react"
import { Input } from "../input"
import { cn } from "@/lib/utils"

interface PhoneInputProps {
  id: string
  value: string
  autoComplete: string
  onChange: (value: string) => void
  onBlur?: () => void
  countryCode: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function PhoneInput({
  id,
  value,
  autoComplete,
  onChange,
  onBlur,
  countryCode,
  placeholder,
  disabled,
  className,
}: PhoneInputProps) {
  const [maskedValue, setMaskedValue] = useState("")

  useEffect(() => {
    const currentMask = phoneMasks[countryCode]
    if (currentMask && value) {
      const masked = applyMask(value, currentMask.mask)
      setMaskedValue(masked)
    } else {
      setMaskedValue(value)
    }
  }, [value, countryCode])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    const currentMask = phoneMasks[countryCode]

    if (currentMask) {
      const masked = applyMask(inputValue, currentMask.mask)
      setMaskedValue(masked)

      // Enviar apenas os números para o componente pai
      const unmasked = removeMask(masked)
      onChange(unmasked)
    } else {
      setMaskedValue(inputValue)
      onChange(inputValue)
    }
  }

  const currentMask = phoneMasks[countryCode]
  const currentPlaceholder = placeholder || (currentMask ? currentMask.placeholder : "Número do telefone")

  return (
    <Input
      id={id}
      type="text"
      value={maskedValue}
      autoComplete={autoComplete}
      onChange={handleInputChange}
      onBlur={onBlur}
      className={cn("w-full px-3 py-2", className)}
      placeholder={currentPlaceholder}
      disabled={disabled}
    />
  )
}
