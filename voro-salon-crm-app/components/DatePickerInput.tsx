import React, { useState } from "react"
import { View, Text, Pressable, Modal, FlatList } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"

const DAYS_OF_WEEK = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

function parseDate(value: string): Date {
  if (!value) return new Date()
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return new Date()
  return new Date(year, month - 1, day)
}

function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function formatDisplay(value: string): string {
  if (!value) return ""
  const [year, month, day] = value.split("-")
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

function buildCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = Array(firstDay).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

interface DatePickerInputProps {
  value: string
  onChange: (isoDate: string) => void
  placeholder?: string
}

export function DatePickerInput({ value, onChange, placeholder = "Selecionar data" }: DatePickerInputProps) {
  const insets = useSafeAreaInsets()
  const [open, setOpen] = useState(false)

  const initial = value ? parseDate(value) : new Date()
  const [viewYear, setViewYear] = useState(initial.getFullYear())
  const [viewMonth, setViewMonth] = useState(initial.getMonth())
  const [selected, setSelected] = useState<string>(value)

  const today = new Date()
  const todayStr = toISODate(today)

  const days = buildCalendarDays(viewYear, viewMonth)

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  function selectDay(day: number) {
    const iso = toISODate(new Date(viewYear, viewMonth, day))
    setSelected(iso)
  }

  function confirm() {
    onChange(selected || toISODate(today))
    setOpen(false)
  }

  function handleOpen() {
    const base = value ? parseDate(value) : new Date()
    setViewYear(base.getFullYear())
    setViewMonth(base.getMonth())
    setSelected(value)
    setOpen(true)
  }

  return (
    <>
      <Pressable
        onPress={handleOpen}
        className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 flex-row items-center gap-2"
      >
        <Ionicons name="calendar-outline" size={18} color="#71717a" />
        <Text className={`flex-1 font-semibold text-base ${value ? "text-zinc-900" : "text-zinc-400"}`}>
          {value ? formatDisplay(value) : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={14} color="#a1a1aa" />
      </Pressable>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>

          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-100">
            <Text className="text-lg font-black text-zinc-900">Selecionar Data</Text>
            <Pressable onPress={() => setOpen(false)} className="h-9 w-9 bg-zinc-100 rounded-xl items-center justify-center">
              <Ionicons name="close" size={20} color="#71717a" />
            </Pressable>
          </View>

          <View className="px-5 py-4">
            {/* Month navigation */}
            <View className="flex-row items-center justify-between mb-5">
              <Pressable onPress={prevMonth} className="h-10 w-10 bg-zinc-100 rounded-xl items-center justify-center">
                <Ionicons name="chevron-back" size={20} color="#18181b" />
              </Pressable>
              <Text className="text-base font-black text-zinc-900">
                {MONTHS[viewMonth]} {viewYear}
              </Text>
              <Pressable onPress={nextMonth} className="h-10 w-10 bg-zinc-100 rounded-xl items-center justify-center">
                <Ionicons name="chevron-forward" size={20} color="#18181b" />
              </Pressable>
            </View>

            {/* Day of week headers */}
            <View className="flex-row mb-2">
              {DAYS_OF_WEEK.map((d) => (
                <View key={d} className="flex-1 items-center">
                  <Text className="text-xs font-bold text-zinc-400">{d}</Text>
                </View>
              ))}
            </View>

            {/* Calendar grid */}
            {Array.from({ length: days.length / 7 }, (_, row) => (
              <View key={row} className="flex-row mb-1">
                {days.slice(row * 7, row * 7 + 7).map((day, col) => {
                  const iso = day ? toISODate(new Date(viewYear, viewMonth, day)) : null
                  const isSelected = iso === selected
                  const isToday = iso === todayStr

                  return (
                    <View key={col} className="flex-1 items-center py-0.5">
                      {day ? (
                        <Pressable
                          onPress={() => selectDay(day)}
                          className={`h-10 w-10 rounded-2xl items-center justify-center
                            ${isSelected ? "bg-purple-600" : isToday ? "bg-purple-50 border border-purple-200" : "active:bg-zinc-100"}`}
                        >
                          <Text className={`text-sm font-bold
                            ${isSelected ? "text-white" : isToday ? "text-purple-600" : "text-zinc-800"}`}>
                            {day}
                          </Text>
                        </Pressable>
                      ) : (
                        <View className="h-10 w-10" />
                      )}
                    </View>
                  )
                })}
              </View>
            ))}
          </View>

          {/* Footer */}
          <View className="px-5 pb-8 pt-3 border-t border-zinc-100 mt-auto">
            {selected ? (
              <View className="flex-row items-center justify-center gap-1 mb-4">
                <Ionicons name="checkmark-circle" size={16} color="#7c3aed" />
                <Text className="text-purple-600 font-bold text-sm">
                  {formatDisplay(selected)} selecionado
                </Text>
              </View>
            ) : null}
            <Pressable
              onPress={confirm}
              className="h-14 bg-purple-600 rounded-2xl items-center justify-center shadow-sm shadow-purple-200"
            >
              <Text className="text-white font-black text-base">Confirmar</Text>
            </Pressable>
          </View>

        </View>
      </Modal>
    </>
  )
}
