"use client"

import { Input } from "@/components/ui/input"
import type { ChangeEvent } from "react"

function formatCurrency(value: string): string {
  const digits = value.replace(/\D/g, "")
  if (!digits) return ""
  const num = parseInt(digits, 10) / 100
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function parseToNumber(display: string): number {
  if (!display) return 0
  const cleaned = display.replace(/\./g, "").replace(",", ".")
  return parseFloat(cleaned) || 0
}

interface CurrencyInputProps {
  value: number
  onChange: (value: number) => void
  id?: string
  placeholder?: string
  required?: boolean
}

export function CurrencyInput({
  value,
  onChange,
  id,
  placeholder = "0,00",
  required,
}: CurrencyInputProps) {
  const display = value > 0
    ? value.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : ""

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const formatted = formatCurrency(e.target.value)
    onChange(parseToNumber(formatted))
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        R$
      </span>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={display}
        onChange={handleChange}
        required={required}
        className="pl-10"
      />
    </div>
  )
}
