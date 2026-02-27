"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Clock, ChevronUp, ChevronDown } from "lucide-react"
import { Input } from "../input"
import { cn } from "@/lib/utils"

interface TimePickerProps {
  value: string // Time string in HH:mm format
  id?: string
  onChange: (time: string) => void
  onBlur?: () => void
  placeholder?: string
  disabled?: boolean
  timeStep?: number // minutes step (default: 15)
  minTime?: string // HH:mm format
  maxTime?: string // HH:mm format
  className?: string
}

export function TimePicker({
  value,
  id,
  onChange,
  onBlur,
  placeholder = "hh:mm",
  disabled,
  timeStep = 15,
  minTime,
  maxTime,
  className,
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [displayValue, setDisplayValue] = useState("")
  const [selectedHour, setSelectedHour] = useState(9) // Default 9 AM
  const [selectedMinute, setSelectedMinute] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Apply mask hh:mm
  const applyTimeMask = (inputValue: string): string => {
    const numbers = inputValue.replace(/\D/g, "")
    let masked = ""

    for (let i = 0; i < numbers.length && i < 4; i++) {
      if (i === 2) {
        masked += ":"
      }
      masked += numbers[i]
    }

    return masked
  }

  // Validate time string
  const isValidTime = (timeString: string): boolean => {
    if (timeString.length !== 5) return false // hh:mm

    const [hours, minutes] = timeString.split(":").map(Number)
    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59
  }

  // Format time from HH:mm to display format
  const formatTime = (timeString: string): string => {
    if (!timeString || !isValidTime(timeString)) return ""
    return timeString
  }

  // Parse time from display format
  const parseTime = (displayTime: string): { hour: number; minute: number } | null => {
    if (!displayTime || !isValidTime(displayTime)) return null

    const [hours, minutes] = displayTime.split(":").map(Number)
    return { hour: hours, minute: minutes }
  }

  // Update time and call onChange
  const updateTime = useCallback(
    (hour: number, minute: number) => {
      const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
      onChange(timeString)
    },
    [onChange],
  )

  // Sync internal state with external value
  useEffect(() => {
    setDisplayValue(formatTime(value))
    if (value && isValidTime(value)) {
      const parsed = parseTime(value)
      if (parsed) {
        setSelectedHour(parsed.hour)
        setSelectedMinute(parsed.minute)
      }
    }
  }, [value])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = applyTimeMask(e.target.value)
    setDisplayValue(masked)

    if (masked.length === 5 && isValidTime(masked)) {
      const parsed = parseTime(masked)
      if (parsed) {
        setSelectedHour(parsed.hour)
        setSelectedMinute(parsed.minute)
        onChange(masked)
      }
    } else if (masked.length === 0) {
      onChange("")
    }
  }

  const handleInputBlur = () => {
    if (displayValue.length === 5 && !isValidTime(displayValue)) {
      setDisplayValue("")
      onChange("")
    }
    onBlur?.()
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
    } else {
      if (direction === "up") {
        newMinute = selectedMinute + timeStep
        if (newMinute >= 60) newMinute = 0
      } else {
        newMinute = selectedMinute - timeStep
        if (newMinute < 0) newMinute = 60 - timeStep
      }
    }

    setSelectedHour(newHour)
    setSelectedMinute(newMinute)
    updateTime(newHour, newMinute)
  }

  const setQuickTime = (hour: number, minute: number) => {
    setSelectedHour(hour)
    setSelectedMinute(minute)
    updateTime(hour, minute)
  }

  const setCurrentTime = () => {
    const now = new Date()
    const hour = now.getHours()
    const minute = now.getMinutes()
    setSelectedHour(hour)
    setSelectedMinute(minute)
    updateTime(hour, minute)
  }

  const clearTime = () => {
    onChange("")
    setIsOpen(false)
  }

  const renderTimePicker = () => {
    return (
      <div className="p-4">
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
        {/* Updated input to use theme colors */}
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
          maxLength={5}
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          disabled={disabled}
        >
          <Clock size={18} />
        </button>
      </div>

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 min-w-[300px]">
          {/* Time Picker Content */}
          {renderTimePicker()}

          {/* Updated footer with theme colors */}
          <div className="flex justify-between items-center px-4 py-3 border-t border-border">
            <button
              type="button"
              onClick={() => {
                setCurrentTime()
                setIsOpen(false)
              }}
              className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Agora
            </button>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={clearTime}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
