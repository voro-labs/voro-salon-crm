"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { format, addDays, startOfDay, isSameDay, startOfWeek, isToday } from "date-fns"
import { ptBR } from "date-fns/locale"
import { StatusDropdown } from "@/components/ui/custom/status-badge"
import { BusinessHoursDay, HOUR_HEIGHT, STATUS_COLORS } from "./appointments.types"

interface CalendarWeekViewProps {
  weekStart: Date
  appointments: any[]
  onSlotClick: (date: Date, hour: number, minute: number) => void
  businessHours?: BusinessHoursDay[]
  calStartHour: number
  calEndHour: number
  onStatusChange: (appointmentId: string, newStatus: number) => void
}

export function CalendarWeekView({
  weekStart,
  appointments,
  onSlotClick,
  businessHours,
  calStartHour,
  calEndHour,
  onStatusChange,
}: CalendarWeekViewProps) {
  const router = useRouter()
  const [blockedKey, setBlockedKey] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileDayIdx, setMobileDayIdx] = useState<number>(() => {
    const today = new Date()
    const diff = Math.floor((today.getTime() - startOfWeek(today, { weekStartsOn: 0 }).getTime()) / 86400000)
    return Math.min(Math.max(diff, 0), 6)
  })

  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const hours = Array.from({ length: calEndHour - calStartHour }, (_, i) => calStartHour + i)
  const totalHeight = hours.length * HOUR_HEIGHT

  function isDayClosed(date: Date) {
    if (!businessHours?.length) return false
    const dow = date.getDay()
    const bh = businessHours.find((d) => d.dayOfWeek === dow)
    return !bh || !bh.isOpen
  }

  function isInBusinessHours(date: Date, hour: number, minute: number) {
    if (!businessHours?.length) return true
    const dow = date.getDay()
    const bh = businessHours.find((d) => d.dayOfWeek === dow)
    if (!bh || !bh.isOpen) return false
    const slotMin = hour * 60 + minute
    return bh.ranges.some((r) => {
      const [oh, om] = r.openTime.split(":").map(Number)
      const [ch, cm] = r.closeTime.split(":").map(Number)
      const openMin = oh * 60 + om
      const closeMin = ch * 60 + cm
      return slotMin >= openMin && slotMin + 30 <= closeMin
    })
  }

  function hasConflict(date: Date, hour: number, minute: number) {
    const slotMin = hour * 60 + minute
    const now = new Date()
    return appointments.some((apt) => {
      if (!isSameDay(new Date(apt.scheduledDateTime), date)) return false
      if (apt.status === 3 && new Date(apt.scheduledDateTime) > now) return false
      const aptStart = new Date(apt.scheduledDateTime)
      const aptStartMin = aptStart.getHours() * 60 + aptStart.getMinutes()
      const aptEndMin = aptStartMin + (apt.durationMinutes || 30)
      return slotMin < aptEndMin && slotMin + 30 > aptStartMin
    })
  }

  function getAvailableMinutesFromSlot(date: Date, slotStartMin: number): number {
    const now = new Date()
    const dayAppts = appointments
      .filter((a) => {
        if (!isSameDay(new Date(a.scheduledDateTime), date)) return false
        if (a.status === 3 && new Date(a.scheduledDateTime) > now) return false
        return true
      })
      .sort((a, b) => new Date(a.scheduledDateTime).getTime() - new Date(b.scheduledDateTime).getTime())

    const next = dayAppts.find((a) => {
      const startMin = new Date(a.scheduledDateTime).getHours() * 60 + new Date(a.scheduledDateTime).getMinutes()
      return startMin > slotStartMin
    })

    if (!next) return Infinity
    const nextStartMin = new Date(next.scheduledDateTime).getHours() * 60 + new Date(next.scheduledDateTime).getMinutes()
    return nextStartMin - slotStartMin
  }

  function isSlotPast(date: Date, hour: number, minute: number): boolean {
    const slotTime = new Date(date)
    slotTime.setHours(hour, minute, 0, 0)
    return slotTime < new Date()
  }

  function handleSlotClick(date: Date, hour: number, minute: number) {
    const key = `${date.toISOString()}_${hour}_${minute}`
    const past = isSlotPast(date, hour, minute)
    if (past) {
      if (isDayClosed(date) || hasConflict(date, hour, minute)) {
        setBlockedKey(key)
        setTimeout(() => setBlockedKey(null), 700)
        return
      }
      onSlotClick(date, hour, minute)
      return
    }
    if (isDayClosed(date) || !isInBusinessHours(date, hour, minute) || hasConflict(date, hour, minute)) {
      setBlockedKey(key)
      setTimeout(() => setBlockedKey(null), 700)
      return
    }
    onSlotClick(date, hour, minute)
  }

  // ── Mobile: single-day view ──────────────────────────────────────────────────
  if (isMobile) {
    const visibleDay = days[mobileDayIdx]
    const closed = isDayClosed(visibleDay)
    const dayAppts = appointments.filter((a) => isSameDay(new Date(a.scheduledDateTime), visibleDay))

    return (
      <div className="border rounded-xl overflow-hidden bg-card">
        <div className="flex items-center justify-between px-3 h-12 border-b bg-muted/30 sticky top-0 z-10">
          <button
            className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent/20 transition-colors disabled:opacity-50"
            onClick={() => setMobileDayIdx((i) => Math.max(i - 1, 0))}
            disabled={mobileDayIdx === 0}
            aria-label="Dia anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex flex-col items-center">
            <span
              className={`text-sm font-semibold capitalize ${
                isToday(visibleDay)
                  ? "text-primary"
                  : startOfDay(visibleDay) < startOfDay(new Date())
                  ? "text-muted-foreground/60"
                  : "text-foreground"
              }`}
            >
              {format(visibleDay, "EEE, dd MMM", { locale: ptBR })}
            </span>
            {closed && (
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider leading-none">
                fechado
              </span>
            )}
          </div>

          <button
            className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent/20 transition-colors disabled:opacity-50"
            onClick={() => setMobileDayIdx((i) => Math.min(i + 1, 6))}
            disabled={mobileDayIdx === 6}
            aria-label="Próximo dia"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 300px)" }}>
          <div className="grid grid-cols-2" style={{ minHeight: totalHeight }}>
            <div className="border-r">
              {hours.map((h) => (
                <div
                  key={h}
                  className="border-b text-xs text-muted-foreground text-right pr-2 flex items-start pt-1"
                  style={{ height: HOUR_HEIGHT }}
                >
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            <div
              className={`relative ${isToday(visibleDay) ? "bg-primary/5" : ""}`}
              style={{ height: totalHeight }}
            >
              {hours.flatMap((h) =>
                [0, 30].map((m) => {
                  const inBH = isInBusinessHours(visibleDay, h, m)
                  const past = isSlotPast(visibleDay, h, m)
                  const slotKey = `${visibleDay.toISOString()}_${h}_${m}`
                  const isBlocked = blockedKey === slotKey
                  const topOffset = (h - calStartHour) * HOUR_HEIGHT + (m === 30 ? HOUR_HEIGHT / 2 : 0)
                  const availMins = (!past && !closed && inBH && !hasConflict(visibleDay, h, m))
                    ? getAvailableMinutesFromSlot(visibleDay, h * 60 + m)
                    : Infinity

                  return (
                    <div
                      key={`${h}_${m}`}
                      className={`absolute w-full transition-colors duration-150 ${
                        m === 0 ? "border-b border-border/40" : "border-b border-dashed border-border/20"
                      } ${
                        isBlocked
                          ? "bg-red-100 dark:bg-red-900/30"
                          : past
                          ? "bg-muted/40 cursor-pointer hover:bg-accent/15"
                          : closed || !inBH
                          ? "bg-muted/30 cursor-default"
                          : hasConflict(visibleDay, h, m)
                          ? "bg-muted/20 cursor-default"
                          : availMins < 30
                          ? "bg-amber-50/40 cursor-default"
                          : "cursor-pointer hover:bg-accent/10"
                      }`}
                      style={{ top: topOffset, height: HOUR_HEIGHT / 2 }}
                      onClick={() => handleSlotClick(visibleDay, h, m)}
                    />
                  )
                })
              )}

              {dayAppts.map((apt: any) => {
                const date = new Date(apt.scheduledDateTime)
                const startMin = (date.getHours() - calStartHour) * 60 + date.getMinutes()
                const top = (startMin / 60) * HOUR_HEIGHT
                const height = Math.max((apt.durationMinutes / 60) * HOUR_HEIGHT, 22)
                const colorClass = STATUS_COLORS[apt.status] ?? STATUS_COLORS[0]
                return (
                  <div
                    key={apt.id}
                    className={`absolute inset-x-0.5 rounded border text-[11px] px-1.5 py-1 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity z-10 ${colorClass}`}
                    style={{ top, height }}
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/appointments/${apt.id}`)
                    }}
                  >
                    <p className="font-semibold truncate leading-tight">{apt.clientName}</p>
                    {height > 30 && apt.serviceName && (
                      <p className="truncate text-[10px] opacity-90">{apt.serviceName}</p>
                    )}
                    {height > 40 && (
                      <div className="mt-0.5">
                        <StatusDropdown appointmentId={apt.id} currentStatus={apt.status} onStatusChange={onStatusChange} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Desktop: full 7-day view ─────────────────────────────────────────────────
  return (
    <div className="border rounded-xl overflow-hidden bg-card">
      <div className="grid grid-cols-8 border-b bg-muted/30 sticky top-0 z-10 overflow-y-scroll scrollbar-hide">
        <div className="h-12 border-r" />
        {days.map((day) => {
          const closed = isDayClosed(day)
          const isPastDay = startOfDay(day) < startOfDay(new Date())
          return (
            <div
              key={day.toISOString()}
              className={`h-12 flex flex-col items-center justify-center text-xs border-r last:border-r-0 ${
                isToday(day) ? "bg-primary/10" : isPastDay ? "bg-muted/20" : ""
              } ${closed || isPastDay ? "opacity-70" : ""}`}
            >
              <span className="text-muted-foreground font-medium uppercase tracking-wide text-[10px]">
                {format(day, "EEE", { locale: ptBR })}
              </span>
              <span className={`text-sm font-bold ${isToday(day) ? "text-primary" : "text-foreground"}`}>
                {format(day, "dd")}
              </span>
              {closed && !isPastDay && (
                <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider leading-none">
                  fechado
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className="overflow-y-scroll scrollbar-hide" style={{ maxHeight: "calc(100vh - 300px)" }}>
        <div className="grid grid-cols-8" style={{ minHeight: totalHeight }}>
          <div className="border-r">
            {hours.map((h) => (
              <div
                key={h}
                className="border-b text-xs text-muted-foreground text-right pr-2 flex items-start pt-1"
                style={{ height: HOUR_HEIGHT }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {days.map((day) => {
            const dayAppts = appointments.filter((a) => isSameDay(new Date(a.scheduledDateTime), day))
            const closed = isDayClosed(day)
            return (
              <div
                key={day.toISOString()}
                className={`relative border-r last:border-r-0 ${isToday(day) ? "bg-primary/5" : ""}`}
                style={{ height: totalHeight }}
              >
                {hours.flatMap((h) =>
                  [0, 30].map((m) => {
                    const inBH = isInBusinessHours(day, h, m)
                    const past = isSlotPast(day, h, m)
                    const slotKey = `${day.toISOString()}_${h}_${m}`
                    const isBlocked = blockedKey === slotKey
                    const topOffset = (h - calStartHour) * HOUR_HEIGHT + (m === 30 ? HOUR_HEIGHT / 2 : 0)
                    const availMins = (!past && !closed && inBH && !hasConflict(day, h, m))
                      ? getAvailableMinutesFromSlot(day, h * 60 + m)
                      : Infinity

                    return (
                      <div
                        key={`${h}_${m}`}
                        className={`absolute w-full transition-colors duration-150 ${
                          m === 0 ? "border-b border-border/40" : "border-b border-dashed border-border/20"
                        } ${
                          isBlocked
                            ? "bg-red-100 dark:bg-red-900/30"
                            : past
                            ? "bg-muted/40 cursor-pointer hover:bg-accent/15"
                            : closed || !inBH
                            ? "bg-muted/30 cursor-default"
                            : hasConflict(day, h, m)
                            ? "bg-muted/20 cursor-default"
                            : availMins < 30
                            ? "bg-amber-50/40 cursor-default"
                            : "cursor-pointer hover:bg-accent/10"
                        }`}
                        style={{ top: topOffset, height: HOUR_HEIGHT / 2 }}
                        onClick={() => handleSlotClick(day, h, m)}
                      />
                    )
                  })
                )}

                {dayAppts.map((apt: any) => {
                  const date = new Date(apt.scheduledDateTime)
                  const startMin = (date.getHours() - calStartHour) * 60 + date.getMinutes()
                  const top = (startMin / 60) * HOUR_HEIGHT
                  const height = Math.max((apt.durationMinutes / 60) * HOUR_HEIGHT, 22)
                  const colorClass = STATUS_COLORS[apt.status] ?? STATUS_COLORS[0]
                  return (
                    <div
                      key={apt.id}
                      className={`absolute inset-x-0.5 rounded border text-[11px] px-1.5 py-1 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity z-10 ${colorClass}`}
                      style={{ top, height }}
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/appointments/${apt.id}`)
                      }}
                    >
                      <p className="font-semibold truncate leading-tight">{apt.clientName}</p>
                      {height > 30 && (apt.serviceName || apt.description) && (
                        <p className="truncate text-[10px] opacity-90">{apt.serviceName || apt.description}</p>
                      )}
                      {height > 40 && (
                        <div className="mt-0.5">
                          <StatusDropdown appointmentId={apt.id} currentStatus={apt.status} onStatusChange={onStatusChange} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
