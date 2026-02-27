"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Calendar, ChevronLeft, ChevronRight, Clock, ChevronUp, ChevronDown } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "../input"
import { cn } from "@/lib/utils"

interface DateTimePickerProps {
  value: string // ISO datetime string
  id?: string
  onChange: (datetime: string) => void
  onBlur?: () => void
  placeholder?: string
  disabled?: boolean
  minDate?: string
  maxDate?: string
  timeStep?: number // minutes step (default: 15)
  className?: string
}

export function DateTimePicker({
  value,
  id,
  onChange,
  onBlur,
  placeholder = "dd/mm/aaaa hh:mm",
  disabled,
  minDate,
  maxDate,
  timeStep = 15,
  className,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"date" | "time">("date")
  const [displayValue, setDisplayValue] = useState("")
  const [currentMonth, setCurrentMonth] = useState(new Date().getUTCMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getUTCFullYear())
  const [selectedHour, setSelectedHour] = useState(9) // Default 9 AM
  const [selectedMinute, setSelectedMinute] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ]

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
  const years = Array.from({ length: 20 }, (_, i) => new Date().getUTCFullYear() - 10 + i)

  // Format datetime to Brazilian format (dd/MM/yyyy hh:mm)
  const formatDateTimeToBR = (isoDateTime: string): string => {
    if (!isoDateTime) return ""
    try {
      const date = new Date(isoDateTime)
      const day = date.getDate().toString().padStart(2, "0")
      const month = (date.getUTCMonth() + 1).toString().padStart(2, "0")
      const year = date.getUTCFullYear()
      const hours = date.getHours().toString().padStart(2, "0")
      const minutes = date.getMinutes().toString().padStart(2, "0")
      return `${day}/${month}/${year} ${hours}:${minutes}`
    } catch (error) {
      return ""
    }
  }

  // Apply mask dd/MM/yyyy hh:mm
  const applyDateTimeMask = (inputValue: string): string => {
    const numbers = inputValue.replace(/\D/g, "")
    let masked = ""

    for (let i = 0; i < numbers.length && i < 12; i++) {
      if (i === 2 || i === 4) {
        masked += "/"
      } else if (i === 8) {
        masked += " "
      } else if (i === 10) {
        masked += ":"
      }
      masked += numbers[i]
    }

    return masked
  }

  // Validate datetime string
  const isValidDateTime = (dateTimeString: string): boolean => {
    if (dateTimeString.length !== 16) return false // dd/MM/yyyy hh:mm

    const [datePart, timePart] = dateTimeString.split(" ")
    if (!datePart || !timePart) return false

    // Validate date part
    const [day, month, year] = datePart.split("/").map(Number)
    if (!day || !month || !year) return false

    const date = new Date(year, month - 1, day)
    const isValidDate = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getDate() === day

    // Validate time part
    const [hours, minutes] = timePart.split(":").map(Number)
    const isValidTime = hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59

    return isValidDate && isValidTime
  }

  // Convert BR format to ISO datetime
  const formatDateTimeToISO = (brDateTime: string): string => {
    if (!brDateTime || !isValidDateTime(brDateTime)) return ""

    try {
      const [datePart, timePart] = brDateTime.split(" ")
      const [day, month, year] = datePart.split("/").map(Number)
      const [hours, minutes] = timePart.split(":").map(Number)

      const date = new Date(year, month - 1, day, hours, minutes)
      return date.toISOString()
    } catch (error) {
      return ""
    }
  }

  useEffect(() => {
    setDisplayValue(formatDateTimeToBR(value))
    if (value) {
      const date = new Date(value)
      setCurrentMonth(date.getUTCMonth())
      setCurrentYear(date.getUTCFullYear())
      setSelectedHour(date.getHours())
      setSelectedMinute(date.getMinutes())
    }
  }, [value])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        !(event.target instanceof HTMLElement && event.target.closest("[data-radix-popper-content-wrapper]"))
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = applyDateTimeMask(e.target.value)
    setDisplayValue(masked)

    if (masked.length === 16 && isValidDateTime(masked)) {
      const isoDateTime = formatDateTimeToISO(masked)
      onChange(isoDateTime)
    } else if (masked.length === 0) {
      onChange("")
    }
  }

  const handleInputBlur = () => {
    if (displayValue.length === 16 && !isValidDateTime(displayValue)) {
      setDisplayValue("")
      onChange("")
    }
    onBlur?.()
  }

  const getDaysInMonth = (month: number, year: number): number => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (month: number, year: number): number => {
    return new Date(year, month, 1).getDay()
  }

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(currentYear, currentMonth, day, selectedHour, selectedMinute)
    onChange(selectedDate.toISOString())
    setActiveTab("time")
  }

  const navigateMonth = (direction: "prev" | "next") => {
    if (direction === "prev") {
      if (currentMonth === 0) {
        setCurrentMonth(11)
        setCurrentYear(currentYear - 1)
      } else {
        setCurrentMonth(currentMonth - 1)
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0)
        setCurrentYear(currentYear + 1)
      } else {
        setCurrentMonth(currentMonth + 1)
      }
    }
  }

  const adjustTime = (type: "hour" | "minute", direction: "up" | "down") => {
    let newHour = selectedHour
    let newMinute = selectedMinute

    if (type === "hour") {
      if (direction === "up") {
        newHour = selectedHour === 23 ? 0 : selectedHour + 1
      } else {
        newHour = selectedHour === 0 ? 23 : selectedHour - 1
      }
      setSelectedHour(newHour)
    } else {
      if (direction === "up") {
        newMinute = selectedMinute + timeStep
        if (newMinute >= 60) newMinute = 0
      } else {
        newMinute = selectedMinute - timeStep
        if (newMinute < 0) newMinute = 60 - timeStep
      }
      setSelectedMinute(newMinute)
    }

    if (value) {
      const currentDate = new Date(value)
      const newDate = new Date(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth(),
        currentDate.getDate(),
        type === "hour" ? newHour : selectedHour,
        type === "minute" ? newMinute : selectedMinute,
      )
      onChange(newDate.toISOString())
    } else {
      // If no date selected yet, use today
      const today = new Date()
      const newDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        type === "hour" ? newHour : selectedHour,
        type === "minute" ? newMinute : selectedMinute,
      )
      onChange(newDate.toISOString())
    }
  }

  const setQuickTime = (hour: number, minute: number) => {
    setSelectedHour(hour)
    setSelectedMinute(minute)

    if (value) {
      const currentDate = new Date(value)
      const newDate = new Date(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth(),
        currentDate.getDate(),
        hour,
        minute,
      )
      onChange(newDate.toISOString())
    } else {
      const today = new Date()
      const newDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, minute)
      onChange(newDate.toISOString())
    }
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear)
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear)
    const days = []

    // Empty days at the beginning of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected =
        value &&
        new Date(value).getDate() === day &&
        new Date(value).getUTCMonth() === currentMonth &&
        new Date(value).getUTCFullYear() === currentYear

      const isToday =
        new Date().getDate() === day &&
        new Date().getUTCMonth() === currentMonth &&
        new Date().getUTCFullYear() === currentYear

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => handleDateSelect(day)}
          className={`w-8 h-8 text-sm rounded-full hover:bg-blue-100 transition-colors ${
            isSelected
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : isToday
                ? "bg-blue-100 text-blue-600 font-semibold"
                : "text-white-700 hover:text-blue-600"
          }`}
        >
          {day}
        </button>,
      )
    }

    return days
  }

  const renderTimePicker = () => {
    return (
      <div className="p-4">
        <div className="text-center mb-4">
          <h4 className="text-sm font-medium text-foreground mb-2">Selecionar Horário</h4>
        </div>

        <div className="flex items-center justify-center space-x-4">
          {/* Hour Picker */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => adjustTime("hour", "up")}
              className="p-2 hover:bg-accent rounded-md transition-colors text-foreground"
            >
              <ChevronUp size={18} />
            </button>
            <div className="w-16 h-16 flex items-center justify-center bg-primary/10 border-2 border-primary/20 rounded-lg font-mono text-2xl font-semibold text-primary">
              {selectedHour.toString().padStart(2, "0")}
            </div>
            <button
              type="button"
              onClick={() => adjustTime("hour", "down")}
              className="p-2 hover:bg-accent rounded-md transition-colors text-foreground"
            >
              <ChevronDown size={18} />
            </button>
            <span className="text-xs text-muted-foreground mt-2 font-medium">Hora</span>
          </div>

          <div className="text-3xl font-bold text-muted-foreground/50 mb-6">:</div>

          {/* Minute Picker */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => adjustTime("minute", "up")}
              className="p-2 hover:bg-accent rounded-md transition-colors text-foreground"
            >
              <ChevronUp size={18} />
            </button>
            <div className="w-16 h-16 flex items-center justify-center bg-primary/10 border-2 border-primary/20 rounded-lg font-mono text-2xl font-semibold text-primary">
              {selectedMinute.toString().padStart(2, "0")}
            </div>
            <button
              type="button"
              onClick={() => adjustTime("minute", "down")}
              className="p-2 hover:bg-accent rounded-md transition-colors text-foreground"
            >
              <ChevronDown size={18} />
            </button>
            <span className="text-xs text-muted-foreground mt-2 font-medium">Min</span>
          </div>
        </div>

        {/* Quick time buttons */}
        <div className="mt-6 grid grid-cols-4 gap-2">
          {[
            { label: "09:00", hour: 9, minute: 0 },
            { label: "12:00", hour: 12, minute: 0 },
            { label: "14:00", hour: 14, minute: 0 },
            { label: "18:00", hour: 18, minute: 0 },
          ].map((time) => (
            <button
              key={time.label}
              type="button"
              onClick={() => setQuickTime(time.hour, time.minute)}
              className="px-3 py-2 text-sm bg-accent hover:bg-accent/80 text-accent-foreground rounded-md transition-colors font-medium"
            >
              {time.label}
            </button>
          ))}
        </div>

        {/* Additional quick times */}
        <div className="mt-2 grid grid-cols-4 gap-2">
          {[
            { label: "08:00", hour: 8, minute: 0 },
            { label: "13:00", hour: 13, minute: 0 },
            { label: "16:00", hour: 16, minute: 0 },
            { label: "20:00", hour: 20, minute: 0 },
          ].map((time) => (
            <button
              key={time.label}
              type="button"
              onClick={() => setQuickTime(time.hour, time.minute)}
              className="px-3 py-2 text-sm bg-accent hover:bg-accent/80 text-accent-foreground rounded-md transition-colors font-medium"
            >
              {time.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          type="text"
          id={id}
          value={displayValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={() => setIsOpen(true)}
          className={cn(
            "w-full px-3 py-2 pr-10 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring",
            className,
          )}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          maxLength={16}
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          disabled={disabled}
        >
          <Calendar size={18} />
        </button>
      </div>

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 min-w-[320px]">
          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              type="button"
              onClick={() => setActiveTab("date")}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "date"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Calendar size={16} className="inline mr-2" />
              Data
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("time")}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "time"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Clock size={16} className="inline mr-2" />
              Horário
            </button>
          </div>

          {/* Content */}
          {activeTab === "date" ? (
            <div className="p-4">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => navigateMonth("prev")}
                  className="p-1 hover:bg-accent rounded-full transition-colors text-foreground"
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="flex items-center space-x-2">
                  <Select value={`${currentMonth}`} onValueChange={(v) => setCurrentMonth(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month, index) => (
                        <SelectItem key={index} value={`${index}`}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={`${currentYear}`} onValueChange={(v) => setCurrentYear(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={`${year}`}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <button
                  type="button"
                  onClick={() => navigateMonth("next")}
                  className="p-1 hover:bg-accent rounded-full transition-colors text-foreground"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Week Days */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((day) => (
                  <div key={day} className="text-xs font-medium text-muted-foreground text-center py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar */}
              <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>
            </div>
          ) : (
            renderTimePicker()
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center px-4 py-3 border-t border-border">
            <button
              type="button"
              onClick={() => {
                const now = new Date()
                onChange(now.toISOString())
                setCurrentMonth(now.getUTCMonth())
                setCurrentYear(now.getUTCFullYear())
                setSelectedHour(now.getHours())
                setSelectedMinute(now.getMinutes())
                setIsOpen(false)
              }}
              className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Agora
            </button>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  onChange("")
                  setIsOpen(false)
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Limpar
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
