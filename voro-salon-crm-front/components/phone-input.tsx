"use client"

import { Input } from "@/components/ui/input"
import type { ChangeEvent } from "react"

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11)
  if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : ""
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  id?: string
  placeholder?: string
  required?: boolean
}

export function PhoneInput({
  value,
  onChange,
  id,
  placeholder = "(00) 00000-0000",
  required,
}: PhoneInputProps) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const formatted = formatPhone(e.target.value)
    onChange(formatted)
  }

  return (
    <Input
      id={id}
      type="tel"
      inputMode="numeric"
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      required={required}
      maxLength={15}
    />
  )
}
