"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import Link from "next/link"
import { Plus, Search, Calendar, Clock, Lock, MessageCircle, Ban, X, ChevronLeft, ChevronRight, LayoutGrid, List, CalendarDays, Mic, Square, Zap, Check, AlertTriangle, Loader2 } from "lucide-react"
import { ExportMenu } from "@/components/ui/custom/export-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { SearchableSelect } from "@/components/ui/custom/searchable-select"
import { CurrencyInput } from "@/components/currency-input"
import { format, addDays, startOfDay, endOfDay, startOfWeek, endOfWeek, isSameDay, addWeeks, subWeeks, isToday } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { PagedResult } from "@/hooks/use-data-list.hook"

import { API_CONFIG, secureApiCall } from "@/lib/api"
import { AuthGuard } from "@/components/auth/auth.guard"
import { useAuth } from "@/contexts/auth.context"

import { useDataList } from "@/hooks/use-data-list.hook"
import { useSubscription } from "@/hooks/use-subscription.hook"
import { PageHeader } from "@/components/ui/custom/page-header"
import { EmptyState } from "@/components/ui/custom/empty-state"
import { ListSkeleton } from "@/components/ui/custom/list-skeleton"
import { StatusBadge, appointmentStatusConfig } from "@/components/ui/custom/status-badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { QuickCreateClient } from "@/components/custom/quick-create-client"
import { QuickCreateService } from "@/components/custom/quick-create-service"
import { toast } from "sonner"
import { fetcher } from "@/lib/fetcher"

// ─── Types ────────────────────────────────────────────────────────────────────

interface BusinessHoursDay {
  dayOfWeek: number
  isOpen: boolean
  ranges: { openTime: string; closeTime: string }[]
}

// ─── Calendar constants ───────────────────────────────────────────────────────

const HOUR_HEIGHT = 64 // px per hour

const STATUS_COLORS: Record<number, string> = {
  0: "bg-amber-100 border-amber-300 text-amber-900",
  1: "bg-blue-100 border-blue-300 text-blue-900",
  2: "bg-emerald-100 border-emerald-300 text-emerald-900",
  3: "bg-red-100 border-red-300 text-red-900",
  4: "bg-gray-100 border-gray-300 text-gray-700",
}

// ─── Status dropdown ─────────────────────────────────────────────────────────

function StatusDropdown({
  appointmentId,
  currentStatus,
  onStatusChange,
}: {
  appointmentId: string
  currentStatus: number
  onStatusChange: (id: string, newStatus: number) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => { e.stopPropagation(); e.preventDefault() }}>
        <button className="cursor-pointer">
          <StatusBadge status={currentStatus} showChevron />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {(Object.entries(appointmentStatusConfig) as [string, typeof appointmentStatusConfig[0]][]).map(([key, config]) => {
          const Icon = config.icon
          const isActive = currentStatus === Number(key)
          return (
            <DropdownMenuItem
              key={key}
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onStatusChange(appointmentId, Number(key)) }}
              className={isActive ? "font-semibold" : ""}
            >
              <Icon className="h-4 w-4 mr-2 shrink-0" />
              {config.label}
              {isActive && <Check className="ml-auto h-3 w-3" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Calendar week view ───────────────────────────────────────────────────────

function CalendarWeekView({
  weekStart,
  appointments,
  onSlotClick,
  businessHours,
  calStartHour,
  calEndHour,
  onStatusChange,
}: {
  weekStart: Date
  appointments: any[]
  onSlotClick: (date: Date, hour: number, minute: number) => void
  businessHours?: BusinessHoursDay[]
  calStartHour: number
  calEndHour: number
  onStatusChange: (appointmentId: string, newStatus: number) => void
}) {
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
      // slot começa dentro do range E ainda cabe (pelo menos 30 min antes de fechar)
      return slotMin >= openMin && slotMin + 30 <= closeMin
    })
  }

  function hasConflict(date: Date, hour: number, minute: number) {
    const slotMin = hour * 60 + minute
    const now = new Date()
    return appointments.some((apt) => {
      if (!isSameDay(new Date(apt.scheduledDateTime), date)) return false
      // Cancelados no futuro liberam o slot para novo agendamento
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
    // Slots passados: permitir clique para histórico, bloqueando apenas dia fechado ou conflito
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
        {/* Mobile header with prev/next */}
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

        {/* Mobile grid body */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 300px)" }}>
          <div className="grid grid-cols-2" style={{ minHeight: totalHeight }}>
            {/* Hour labels */}
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

            {/* Single day column */}
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
      {/* Day headers */}
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

      {/* Grid body */}
      <div className="overflow-y-scroll scrollbar-hide" style={{ maxHeight: "calc(100vh - 300px)" }}>
        <div className="grid grid-cols-8" style={{ minHeight: totalHeight }}>
          {/* Hour labels */}
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

          {/* Day columns */}
          {days.map((day) => {
            const dayAppts = appointments.filter((a) => isSameDay(new Date(a.scheduledDateTime), day))
            const closed = isDayClosed(day)
            return (
              <div
                key={day.toISOString()}
                className={`relative border-r last:border-r-0 ${isToday(day) ? "bg-primary/5" : ""}`}
                style={{ height: totalHeight }}
              >
                {/* Hour grid lines + click targets (30-min slots) */}
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

                {/* Appointment blocks */}
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

// ─── Agenda day view ──────────────────────────────────────────────────────────

function AgendaDayView({
  day,
  appointments,
  businessHours,
  calStartHour,
  calEndHour,
  onSlotClick,
  onStatusChange,
}: {
  day: Date
  appointments: any[]
  businessHours?: BusinessHoursDay[]
  calStartHour: number
  calEndHour: number
  onSlotClick: (date: Date, hour: number, minute: number) => void
  onStatusChange: (appointmentId: string, newStatus: number) => void
}) {
  const router = useRouter()

  const slots: { hour: number; minute: number }[] = []
  for (let h = calStartHour; h < calEndHour; h++) {
    slots.push({ hour: h, minute: 0 })
    slots.push({ hour: h, minute: 30 })
  }

  function isDayClosed() {
    if (!businessHours?.length) return false
    const dow = day.getDay()
    const bh = businessHours.find((d) => d.dayOfWeek === dow)
    return !bh || !bh.isOpen
  }

  function isInBusinessHours(hour: number, minute: number) {
    if (!businessHours?.length) return true
    const dow = day.getDay()
    const bh = businessHours.find((d) => d.dayOfWeek === dow)
    if (!bh || !bh.isOpen) return false
    const slotMin = hour * 60 + minute
    return bh.ranges.some((r) => {
      const [oh, om] = r.openTime.split(":").map(Number)
      const [ch, cm] = r.closeTime.split(":").map(Number)
      return slotMin >= oh * 60 + om && slotMin + 30 <= ch * 60 + cm
    })
  }

  function isSlotPast(hour: number, minute: number) {
    const t = new Date(day)
    t.setHours(hour, minute, 0, 0)
    return t < new Date()
  }

  type SlotInfo =
    | { type: "appointment"; apt: any }
    | { type: "continuation"; apt: any }
    | { type: "empty" }

  const slotMap = new Map<string, SlotInfo>()

  const dayAppts = appointments
    .filter((a) => {
      if (!isSameDay(new Date(a.scheduledDateTime), day)) return false
      if (a.status === 3) return false
      return true
    })
    .sort((a, b) => new Date(a.scheduledDateTime).getTime() - new Date(b.scheduledDateTime).getTime())

  for (const apt of dayAppts) {
    const start = new Date(apt.scheduledDateTime)
    const startMin = start.getHours() * 60 + start.getMinutes()
    const duration = apt.durationMinutes || 30
    const startSlot = Math.floor(startMin / 30) * 30

    for (let m = startSlot; m < startMin + duration; m += 30) {
      const h = Math.floor(m / 60)
      const min = m % 60
      const key = `${h}_${min}`
      if (!slotMap.has(key)) {
        slotMap.set(key, m === startSlot ? { type: "appointment", apt } : { type: "continuation", apt })
      }
    }
  }

  const closed = isDayClosed()

  return (
    <div className="border rounded-xl overflow-hidden bg-card">
      {closed && (
        <div className="text-center py-2.5 text-xs text-muted-foreground bg-muted/30 border-b">
          Estabelecimento fechado neste dia
        </div>
      )}
      <div className="divide-y divide-border/40">
        {slots.map(({ hour, minute }) => {
          const key = `${hour}_${minute}`
          const inBH = isInBusinessHours(hour, minute)
          const past = isSlotPast(hour, minute)
          const info: SlotInfo = slotMap.get(key) ?? { type: "empty" }
          const isFullHour = minute === 0
          const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`

          // Fora do horário comercial → "(pausa)"
          if (!inBH && info.type === "empty") {
            return (
              <div key={key} className="relative flex items-center gap-3 px-4 py-1.5 bg-muted/10">
                <span className="text-[20px] text-muted-foreground/70 w-11 shrink-0 font-mono">{timeStr}</span>
                <span className="text-[20px] text-muted-foreground/70 italic select-none">Fechado</span>
              </div>
            )
          }

          if (info.type === "continuation") {
            const colorClass = STATUS_COLORS[info.apt.status] ?? STATUS_COLORS[0]
            return (
              <div
                key={key}
                className={`relative flex items-center gap-3 px-4 py-1.5 cursor-pointer hover:opacity-80 transition-opacity border-l-4 ${past ? "opacity-70" : "opacity-70"} ${colorClass}`}
                onClick={() => router.push(`/appointments/${info.apt.id}`)}
              >
                <span className={`w-11 shrink-0 font-mono ${isFullHour ? "text-[11px] text-muted-foreground/70" : "text-[10px] text-muted-foreground/70"}`}>{timeStr}</span>
                <span className="text-[10px] text-muted-foreground/70 italic truncate">{info.apt.clientName}</span>
              </div>
            )
          }

          if (info.type === "appointment") {
            const { apt } = info
            const colorClass = STATUS_COLORS[apt.status] ?? STATUS_COLORS[0]
            return (
              <div
                key={key}
                className={`relative flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:opacity-90 transition-opacity border-l-4 ${colorClass} ${past ? "opacity-70" : ""}`}
                onClick={() => router.push(`/appointments/${apt.id}`)}
              >
                <span className={`font-mono font-semibold w-11 shrink-0 ${isFullHour ? "text-xs" : "text-[11px]"}`}>{timeStr}</span>
                <div className="flex flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                  <span className="font-semibold text-sm truncate">{apt.clientName}</span>
                  {apt.serviceName && (
                    <>
                      <span className="text-muted-foreground/60">·</span>
                      <span className="text-muted-foreground text-xs truncate">{apt.serviceName}</span>
                    </>
                  )}
                  {apt.amount > 0 && (
                    <>
                      <span className="text-muted-foreground/60">·</span>
                      <span className="text-xs font-medium">
                        {Number(apt.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </>
                  )}
                  {apt.durationMinutes > 30 && (
                    <>
                      <span className="text-muted-foreground/60">·</span>
                      <span className="text-xs text-muted-foreground">{apt.durationMinutes}min</span>
                    </>
                  )}
                </div>
                <StatusDropdown appointmentId={apt.id} currentStatus={apt.status} onStatusChange={onStatusChange} />
              </div>
            )
          }

          // Slot vazio dentro do horário comercial
          return (
            <button
              key={key}
              className={`relative flex items-center gap-3 px-4 w-full text-left transition-colors ${
                isFullHour ? "py-2.5" : "py-1.5"
              } ${
                past
                  ? "opacity-75 hover:bg-amber-50/50 cursor-pointer"
                  : "hover:bg-accent/10 cursor-pointer"
              }`}
              onClick={() => onSlotClick(day, hour, minute)}
            >
              {past && <div className="absolute inset-x-0 top-1/2 h-px bg-muted-foreground/40 pointer-events-none" />}
              <span className={`font-mono w-11 shrink-0 ${
                past
                  ? "text-[20px] text-muted-foreground/70"
                  : isFullHour
                  ? "text-[21px] text-muted-foreground"
                  : "text-[20px] text-muted-foreground"
              }`}>{timeStr}</span>
              {!past && <div className={`flex-1 border-t border-dashed border-border/25`} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<"list" | "calendar" | "agenda">("list")
  const { data: tenantMe } = useSWR<{ appointmentViewMode: string | null }>(API_CONFIG.ENDPOINTS.TENANT_ME, fetcher)

  useEffect(() => {
    if (!tenantMe) return
    const saved = tenantMe.appointmentViewMode as "list" | "calendar" | "agenda" | null
    if (saved === "list" || saved === "calendar" || saved === "agenda") setViewMode(saved)
  }, [tenantMe])

  async function handleSetViewMode(mode: "list" | "calendar" | "agenda") {
    setViewMode(mode)
    try {
      await secureApiCall(API_CONFIG.ENDPOINTS.TENANT_ME, {
        method: "PATCH",
        body: JSON.stringify({ appointmentViewMode: mode }),
      })
    } catch { }
  }

  const [calendarWeek, setCalendarWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }))
  const [agendaDay, setAgendaDay] = useState(() => startOfDay(new Date()))

  // ── Status update ─────────────────────────────────────────────────────────
  async function updateAppointmentStatus(id: string, newStatus: number) {
    const statusLabels: Record<number, string> = { 0: "Pendente", 1: "Confirmado", 2: "Concluído", 3: "Cancelado", 4: "Faltou" }
    const res = await secureApiCall(
      `${API_CONFIG.ENDPOINTS.APPOINTMENTS}/${id}/status`,
      { method: "PATCH", body: JSON.stringify(newStatus) }
    )
    if ((res as any).hasError) { toast.error("Erro ao atualizar status."); return }
    toast.success(`Status atualizado para ${statusLabels[newStatus]}`)
    mutateCalendar()
  }

  // ── Overdue status update ─────────────────────────────────────────────────
  async function handleOverdueStatusUpdate(id: string, newStatus: number) {
    setUpdatingOverdueId(id)
    try {
      const res = await secureApiCall(
        `${API_CONFIG.ENDPOINTS.APPOINTMENTS}/${id}/status`,
        { method: "PATCH", body: JSON.stringify(newStatus) }
      )
      if ((res as any).hasError) { toast.error("Erro ao atualizar status."); return }
      const statusLabels: Record<number, string> = { 2: "Concluído", 3: "Cancelado", 4: "Faltou" }
      toast.success(`Status atualizado para ${statusLabels[newStatus] ?? newStatus}`)
      mutateOverdue()
      mutateList()
      mutateCalendar()
    } finally {
      setUpdatingOverdueId(null)
    }
  }

  // ── Quick create state ────────────────────────────────────────────────────
  const [quickCreateSlot, setQuickCreateSlot] = useState<{ date: Date; hour: number; minute: number; isHistoric: boolean } | null>(null)
  const [qcForm, setQcForm] = useState({ clientId: "", serviceId: "none", description: "", amount: 0, durationMinutes: 30, status: 0 })
  const [qcSaving, setQcSaving] = useState(false)

  function openQuickCreate(date: Date, hour: number, minute: number) {
    const slotTime = new Date(date)
    slotTime.setHours(hour, minute, 0, 0)
    const isHistoric = slotTime < new Date()
    setQcForm({ clientId: "", serviceId: "none", description: "", amount: 0, durationMinutes: 30, status: isHistoric ? 2 : 0 })
    setQuickCreateSlot({ date, hour, minute, isHistoric })
  }

  function handleQcServiceChange(serviceId: string) {
    const svc = qcServices.find((s: any) => s.id === serviceId)
    setQcForm((p) => ({
      ...p,
      serviceId,
      amount: svc ? (svc.hasPromotion && svc.promotionalPrice ? svc.promotionalPrice : svc.price) : p.amount,
      durationMinutes: svc?.durationMinutes ?? p.durationMinutes,
      description: svc?.name ?? p.description,
    }))
  }

  async function submitQuickCreate() {
    if (!quickCreateSlot || !qcForm.clientId) return
    if (!qcForm.description.trim()) { return }
    setQcSaving(true)
    try {
      const { date, hour, minute, isHistoric } = quickCreateSlot
      const dt = new Date(date)
      dt.setHours(hour, minute, 0, 0)
      const res = await secureApiCall<any>(API_CONFIG.ENDPOINTS.APPOINTMENTS, {
        method: "POST",
        body: JSON.stringify({
          clientId: qcForm.clientId,
          serviceId: qcForm.serviceId === "none" ? null : qcForm.serviceId,
          scheduledDateTime: dt.toISOString(),
          durationMinutes: qcForm.durationMinutes,
          amount: qcForm.amount,
          description: qcForm.description,
          status: qcForm.status,
          notes: "",
          employeeId: null,
          serviceIds: qcForm.serviceId !== "none" ? [qcForm.serviceId] : [],
          isEncaixe: isHistoric ? true : false,
          skipNotification: isHistoric ? true : undefined,
        }),
      })
      if (res.hasError) {
        alert(res.message || "Erro ao criar agendamento.")
        return
      }
      setQuickCreateSlot(null)
      mutateCalendar()
    } finally {
      setQcSaving(false)
    }
  }

  // ── Audio recording state ──────────────────────────────────────────────────
  const MAX_RECORDING_SECONDS = 60
  const [showAudioModal, setShowAudioModal] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [audioProcessing, setAudioProcessing] = useState(false)
  const [transcriptionResult, setTranscriptionResult] = useState<{
    nome_do_cliente?: string
    servico?: string
    valor?: number | null
    duracao?: number | null
    dia_marcado?: string | null
    horario?: string | null
  } | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  async function beginRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null }
        setRecordingSeconds(0)
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        setAudioProcessing(true)
        try {
          const fd = new FormData()
          fd.append("audio", blob, "recording.webm")
          const result = await secureApiCall<any>(
            `${API_CONFIG.ENDPOINTS.APPOINTMENTS}/transcribe-audio`,
            { method: "POST", body: fd }
          )
          if (!result.hasError && result.data) {
            setTranscriptionResult(result.data.data ?? result.data)
          }
        } finally {
          setAudioProcessing(false)
        }
      }
      mr.start()
      mediaRecorderRef.current = mr
      setIsRecording(true)
      setRecordingSeconds(0)
      let elapsed = 0
      recordingTimerRef.current = setInterval(() => {
        elapsed++
        setRecordingSeconds(elapsed)
        if (elapsed >= MAX_RECORDING_SECONDS) {
          mr.stop()
          setIsRecording(false)
          setShowAudioModal(false)
        }
      }, 1000)
    } catch {
      alert("Não foi possível acessar o microfone.")
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null }
    setRecordingSeconds(0)
  }

  function buildAppointmentUrl() {
    if (!transcriptionResult) return "/appointments/new"
    const params = new URLSearchParams()
    if (transcriptionResult.dia_marcado) {
      params.set("date", transcriptionResult.dia_marcado)
    }
    if (transcriptionResult.horario) {
      const [h, m] = transcriptionResult.horario.split(":").map(Number)
      params.set("hour", String(h))
      params.set("minute", String(m ?? 0))
    }
    if (transcriptionResult.nome_do_cliente) params.set("clientName", transcriptionResult.nome_do_cliente)
    if (transcriptionResult.servico) params.set("description", transcriptionResult.servico)
    if (transcriptionResult.valor != null) params.set("amount", String(transcriptionResult.valor))
    if (transcriptionResult.duracao != null) params.set("durationMinutes", String(transcriptionResult.duracao))
    return `/appointments/new?${params.toString()}`
  }
  const [periodFilter, setPeriodFilter] = useState("today")
  const [showOverdueModal, setShowOverdueModal] = useState(false)
  const [updatingOverdueId, setUpdatingOverdueId] = useState<string | null>(null)

  interface AppointmentItem {
    id: string
    clientName: string
    serviceName?: string
    scheduledDateTime: string
    durationMinutes: number
    status: number
    amount: number
    description?: string
  }

  const {
    items,
    totalCount,
    totalPages,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    setExtraParams,
    isLoading,
    mutate: mutateList,
  } = useDataList<AppointmentItem>(API_CONFIG.ENDPOINTS.APPOINTMENTS, { pageSize: 10 })

  const { data: modules } = useSWR(API_CONFIG.ENDPOINTS.TENANT_MODULES, fetcher)
  const { plan } = useSubscription()
  const { user } = useAuth()
  const isSalonEmployee = user?.roles?.some((r: any) => r.name === "SalonEmployee") ?? false

  // Calendar/Agenda: fetch a broader window of appointments
  const calendarSWRKey = viewMode === "calendar" || viewMode === "agenda"
    ? `${API_CONFIG.ENDPOINTS.APPOINTMENTS}?page=1&pageSize=500`
    : null
  const { data: calendarRaw, mutate: mutateCalendar } = useSWR<PagedResult<AppointmentItem>>(calendarSWRKey, fetcher)
  const calendarItems = calendarRaw?.items ?? []

  // Fetch dedicado para atrasados — chave estática, sem auto-revalidação
  // Filtragem client-side para evitar chave dinâmica (data no key causa re-fetch a cada render)
  const overdueKey = `${API_CONFIG.ENDPOINTS.APPOINTMENTS}?page=1&pageSize=500`
  const { data: overdueRaw, mutate: mutateOverdue } = useSWR<PagedResult<AppointmentItem>>(overdueKey, fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 0,
    revalidateOnReconnect: false,
  })
  const overdueItems = useMemo(() => {
    const now = new Date()
    return (overdueRaw?.items ?? []).filter(a => {
      const aptDate = new Date(a.scheduledDateTime)
      return aptDate < now && (Number(a.status) === 0 || Number(a.status) === 1)
    })
  }, [overdueRaw])
  const overdueCount = overdueItems.length

  // Quick create: clients and services (always fetched so they're ready when dialog opens)
  const { data: qcClientsRaw, mutate: mutateQcClients } = useSWR(API_CONFIG.ENDPOINTS.CLIENTS + "?pageSize=500", fetcher)
  const { data: qcServicesRaw, mutate: mutateQcServices } = useSWR(API_CONFIG.ENDPOINTS.SERVICES + "?pageSize=500", fetcher)
  const qcClients: any[] = qcClientsRaw?.items ?? (Array.isArray(qcClientsRaw) ? qcClientsRaw : [])
  const qcServices: any[] = qcServicesRaw?.items ?? (Array.isArray(qcServicesRaw) ? qcServicesRaw : [])

  // Business hours for calendar grid
  const { data: businessHours } = useSWR<BusinessHoursDay[]>(
    API_CONFIG.ENDPOINTS.BUSINESS_HOURS,
    fetcher
  )

  const { calStartHour, calEndHour } = useMemo(() => {
    if (!businessHours?.length) return { calStartHour: 8, calEndHour: 20 }
    let minH = 23, maxH = 1
    businessHours.forEach((day) => {
      if (!day.isOpen) return
      day.ranges.forEach((r) => {
        const oh = parseInt(r.openTime.split(":")[0], 10)
        const ch = parseInt(r.closeTime.split(":")[0], 10)
        if (oh < minH) minH = oh
        if (ch > maxH) maxH = ch
      })
    })
    // Clamp to reasonable defaults if no ranges found
    if (minH > maxH) return { calStartHour: 8, calEndHour: 20 }
    return { calStartHour: Math.max(minH - 1, 0), calEndHour: Math.min(maxH + 1, 24) }
  }, [businessHours])

  // Count unresolved past appointments in current page (Pending=0 or Confirmed=1, before now)
  const pastCount = useMemo(() => {
    if (!items?.length) return 0
    const now = new Date()
    return items.filter((apt: AppointmentItem) => {
      const aptDate = new Date(apt.scheduledDateTime)
      return aptDate < now && (apt.status === 0 || apt.status === 1)
    }).length
  }, [items])

  // Sync extraParams with periodFilter for server-side date filtering
  useEffect(() => {
    const now = new Date()
    if (periodFilter === "today") {
      setExtraParams({
        dateFrom: startOfDay(now).toISOString(),
        dateTo: endOfDay(now).toISOString(),
      })
    } else if (periodFilter === "week") {
      setExtraParams({
        dateFrom: startOfDay(now).toISOString(),
        dateTo: endOfDay(addDays(now, 7)).toISOString(),
      })
    } else if (periodFilter === "past") {
      const thirtyDaysAgo = new Date(now)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      setExtraParams({
        dateFrom: startOfDay(thirtyDaysAgo).toISOString(),
        dateTo: now.toISOString(),
      })
    } else {
      setExtraParams({})
    }
  }, [periodFilter])

  const isModuleEnabled = (moduleId: number) => {
    return modules?.find((m: any) => m.module === moduleId)?.isEnabled ?? true
  }

  const weekAppointmentsCount = useMemo(() => {
    const now = new Date()
    const weekStart = startOfWeek(now, { locale: ptBR })
    const weekEnd = endOfWeek(now, { locale: ptBR })
    return items.filter((a: any) => {
      const d = new Date(a.scheduledDateTime)
      return d >= weekStart && d <= weekEnd
    }).length
  }, [items])

  const WHATSAPP_UPSELL_KEY = "whatsapp_upsell_dismissed"
  const [upsellDismissed, setUpsellDismissed] = useState(true)

  useEffect(() => {
    setUpsellDismissed(localStorage.getItem(WHATSAPP_UPSELL_KEY) === "true")
  }, [])

  const dismissUpsell = () => {
    localStorage.setItem(WHATSAPP_UPSELL_KEY, "true")
    setUpsellDismissed(true)
  }

  const showWhatsAppUpsell = plan !== undefined && plan.hasWhatsAppBot === false && !upsellDismissed

  // Items already filtered server-side; just expose as-is (server returns ordered by scheduledDateTime)
  const finalFiltered = items

  return (
    <>
    {/* ── Quick create dialog ──────────────────────────────────────────────── */}
    <Dialog open={quickCreateSlot !== null} onOpenChange={(open) => { if (!open) setQuickCreateSlot(null) }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className={`h-4 w-4 ${quickCreateSlot?.isHistoric ? "text-amber-500" : "text-primary"}`} />
            {quickCreateSlot?.isHistoric ? "Registrar no Histórico" : "Agendamento Rápido"}
          </DialogTitle>
          {quickCreateSlot && (
            <DialogDescription className="font-medium text-foreground/80">
              {format(quickCreateSlot.date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              {" · "}
              {String(quickCreateSlot.hour).padStart(2, "0")}:{String(quickCreateSlot.minute).padStart(2, "0")}
              {quickCreateSlot.isHistoric && <span className="ml-2 text-amber-600 text-xs font-normal">· sem notificação</span>}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-1">
          {/* Cliente */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Cliente *</Label>
              <QuickCreateClient
                onSuccess={async (id) => {
                  await mutateQcClients()
                  setQcForm((p) => ({ ...p, clientId: id }))
                }}
              />
            </div>
            <SearchableSelect
              value={qcForm.clientId}
              onValueChange={(v) => setQcForm((p) => ({ ...p, clientId: v }))}
              options={qcClients.map((c: any) => ({ value: c.id, label: c.name }))}
              placeholder="Selecione um cliente"
              searchPlaceholder="Buscar cliente..."
              emptyText="Nenhum cliente encontrado."
            />
          </div>

          {/* Serviço */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Serviço <span className="text-muted-foreground font-normal">(Opcional)</span></Label>
              <QuickCreateService
                onSuccess={async (id, serviceData) => {
                  await mutateQcServices()
                  handleQcServiceChange(id)
                }}
              />
            </div>
            <SearchableSelect
              value={qcForm.serviceId}
              onValueChange={handleQcServiceChange}
              options={[
                { value: "none", label: "Nenhum" },
                ...qcServices.map((s: any) => ({
                  value: s.id,
                  label: s.name,
                  badge: s.price > 0 ? `R$ ${Number(s.price).toFixed(2).replace(".", ",")}` : undefined,
                })),
              ]}
              placeholder="Selecione um serviço"
              searchPlaceholder="Buscar serviço..."
              emptyText="Nenhum serviço encontrado."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Duração */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold">Duração</Label>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 flex-1">
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={Math.floor(qcForm.durationMinutes / 60) || ""}
                    onChange={(e) => {
                      const h = parseInt(e.target.value) || 0
                      const m = qcForm.durationMinutes % 60
                      setQcForm((p) => ({ ...p, durationMinutes: h * 60 + m }))
                    }}
                    className="text-center"
                  />
                  <span className="text-xs text-muted-foreground shrink-0">h</span>
                </div>
                <div className="flex items-center gap-1 flex-1">
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    placeholder="0"
                    value={qcForm.durationMinutes % 60 || ""}
                    onChange={(e) => {
                      const m = Math.min(59, parseInt(e.target.value) || 0)
                      const h = Math.floor(qcForm.durationMinutes / 60)
                      setQcForm((p) => ({ ...p, durationMinutes: h * 60 + m }))
                    }}
                    className="text-center"
                  />
                  <span className="text-xs text-muted-foreground shrink-0">min</span>
                </div>
              </div>
            </div>

            {/* Valor */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold">Valor *</Label>
              <CurrencyInput
                value={qcForm.amount}
                onChange={(v) => setQcForm((p) => ({ ...p, amount: v }))}
              />
            </div>
          </div>

          {/* Descrição */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold">Descrição *</Label>
            <Input
              placeholder="Ex: Corte + barba"
              value={qcForm.description}
              onChange={(e) => setQcForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>
        </div>

        {quickCreateSlot?.isHistoric && (
          <div className="flex flex-col gap-1.5 pt-1">
            <Label className="text-xs font-semibold">Status *</Label>
            <div className="flex gap-2">
              {([2, 3] as const).map((s) => {
                const labels: Record<number, string> = { 2: "Concluído", 3: "Cancelado" }
                const active = qcForm.status === s
                return (
                  <Button
                    key={s}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    className={active
                      ? s === 2 ? "bg-emerald-600 border-emerald-600 hover:bg-emerald-700 flex-1" : "bg-red-500 border-red-500 hover:bg-red-600 flex-1"
                      : s === 2 ? "border-emerald-400 text-emerald-700 hover:bg-emerald-50 flex-1" : "border-red-400 text-red-700 hover:bg-red-50 flex-1"
                    }
                    onClick={() => setQcForm((p) => ({ ...p, status: s }))}
                  >
                    {labels[s]}
                  </Button>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1"
            onClick={submitQuickCreate}
            disabled={qcSaving || !qcForm.clientId || !qcForm.description.trim() || qcForm.amount <= 0}
          >
            {qcSaving ? "Salvando..." : quickCreateSlot?.isHistoric ? "Salvar Histórico" : "Salvar"}
          </Button>
          <Button variant="outline" asChild>
            <Link href={quickCreateSlot ? `/appointments/new?date=${format(quickCreateSlot.date, "yyyy-MM-dd")}&hour=${quickCreateSlot.hour}&minute=${quickCreateSlot.minute}${qcForm.clientId ? `&clientId=${qcForm.clientId}` : ""}${qcForm.serviceId && qcForm.serviceId !== "none" ? `&serviceId=${qcForm.serviceId}` : ""}` : "/appointments/new"}>
              Completo
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Modal de instrução para gravação de áudio */}
    <Dialog
      open={showAudioModal}
      onOpenChange={(open) => {
        if (!open && isRecording) return
        setShowAudioModal(open)
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-primary" />
            {isRecording ? "Gravando..." : "Agendar por voz"}
          </DialogTitle>
        </DialogHeader>

        {isRecording ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-red-100 animate-pulse">
              <Mic className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-lg font-mono font-bold text-red-500 tabular-nums">
              {MAX_RECORDING_SECONDS - recordingSeconds}s
            </p>
            <div className="rounded-lg bg-muted/40 border border-border/60 px-4 py-3 w-full">
              <p className="text-sm text-foreground leading-relaxed italic">
                "Agendar a Maria Silva para corte e escova na sexta-feira às 14h, vai durar 1 hora e meia, valor R$ 120."
              </p>
            </div>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => {
                stopRecording()
                setShowAudioModal(false)
              }}
            >
              <Square className="mr-2 h-4 w-4" />
              Parar gravação
            </Button>
          </div>
        ) : (
          <>
            <DialogDescription>
              Fale as informações do agendamento em voz alta. A IA vai extrair os dados automaticamente.
            </DialogDescription>

            <div className="flex flex-col gap-3 py-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Diga algo como:</p>
              <div className="rounded-lg bg-muted/40 border border-border/60 px-4 py-3">
                <p className="text-sm text-foreground leading-relaxed italic">
                  "Agendar a Maria Silva para corte e escova na sexta-feira às 14h, vai durar 1 hora e meia, valor R$ 120."
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">O sistema vai detectar:</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { emoji: "👤", label: "Nome do cliente" },
                    { emoji: "✂️", label: "Serviço" },
                    { emoji: "📅", label: "Data / dia da semana" },
                    { emoji: "🕐", label: "Horário" },
                    { emoji: "⏱️", label: "Duração" },
                    { emoji: "💰", label: "Valor" },
                  ].map(({ emoji, label }) => (
                    <div key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{emoji}</span>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                Campos não mencionados ficam em branco no formulário. Se o serviço estiver cadastrado, o valor e duração são preenchidos automaticamente.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={beginRecording}>
                <Mic className="mr-2 h-4 w-4" />
                Iniciar gravação
              </Button>
              <Button variant="outline" onClick={() => setShowAudioModal(false)}>
                Cancelar
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>

    <AuthGuard requiredRoles={["SalonOwner", "SalonEmployee", "Owner"]}>
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Agendamentos"
          action={
            <div className="flex flex-col gap-2 w-full">
              {/* Linha 2: ações — ícone-only nos secundários em mobile */}
              <div className="flex flex-wrap items-center gap-1.5 justify-end">
                <ExportMenu
                  size="sm"
                  rows={finalFiltered}
                  filename="agendamentos"
                  columns={[
                    { header: "Cliente", value: (a: any) => a.clientName },
                    { header: "Serviço", value: (a: any) => a.serviceName ?? "" },
                    { header: "Data/Hora", value: (a: any) => format(new Date(a.scheduledDateTime), "dd/MM/yyyy HH:mm") },
                    { header: "Duração (min)", value: (a: any) => a.durationMinutes },
                    { header: "Valor (R$)", value: (a: any) => Number(a.amount ?? 0).toFixed(2) },
                    { header: "Status", value: (a: any) => ["Pendente","Confirmado","Concluído","Cancelado","Faltou"][a.status] ?? a.status },
                    { header: "Descrição", value: (a: any) => a.description ?? "" },
                  ]}
                />
                {!isSalonEmployee && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/appointments/blocked">
                      <Ban className="h-4 w-4 sm:mr-2" />
                      <span>Bloqueios</span>
                    </Link>
                  </Button>
                )}
                <Button asChild size="sm">
                  <Link href="/appointments/new">
                    <Plus className="mr-1.5 h-4 w-4" />
                    <span className="hidden sm:inline">Novo Agendamento</span>
                    <span className="sm:hidden">Novo</span>
                  </Link>
                </Button>
              </div>
              {/* Linha 1: filtro de período + toggle de visualização */}
              <div className="flex flex-wrap items-center justify-between w-full gap-2">
                {viewMode === "list" ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tabs value={periodFilter} onValueChange={setPeriodFilter}>
                      <TabsList className="w-full sm:w-fit bg-muted/50 border border-border/40 h-8 p-0.5">
                        <TabsTrigger value="today" className="flex-1 sm:flex-none text-xs h-7 px-3">
                          Hoje
                          {periodFilter !== "past" && pastCount > 0 && (
                            <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                              {pastCount}
                            </span>
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="week" className="flex-1 sm:flex-none text-xs h-7 px-3">Semana</TabsTrigger>
                        <TabsTrigger value="all" className="flex-1 sm:flex-none text-xs h-7 px-3">Tudo</TabsTrigger>
                        <TabsTrigger value="past" className="flex-1 sm:flex-none text-xs h-7 px-3">Anteriores</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20 shrink-0"
                      onClick={() => setShowOverdueModal(true)}
                    >
                      <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                      Atrasados
                      {overdueCount > 0 && (
                        <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                          {overdueCount}
                        </span>
                      )}
                    </Button>
                  </div>
                ) : viewMode === "calendar" ? (
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCalendarWeek(w => subWeeks(w, 1))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap min-w-0">
                      {format(calendarWeek, "dd MMM", { locale: ptBR })} — {format(addDays(calendarWeek, 6), "dd MMM yyyy", { locale: ptBR })}
                    </span>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCalendarWeek(w => addWeeks(w, 1))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-primary px-2" onClick={() => setCalendarWeek(startOfWeek(new Date(), { weekStartsOn: 0 }))}>
                      Hoje
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setAgendaDay(d => addDays(d, -1))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap capitalize min-w-0">
                      {format(agendaDay, "EEE, dd 'de' MMM yyyy", { locale: ptBR })}
                    </span>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setAgendaDay(d => addDays(d, 1))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-primary px-2" onClick={() => setAgendaDay(startOfDay(new Date()))}>
                      Hoje
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Mic button + timer */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={isRecording ? stopRecording : () => setShowAudioModal(true)}
                      disabled={audioProcessing}
                      className={`flex items-center justify-center h-7 w-7 rounded-md border transition-colors ${
                        isRecording
                          ? "bg-red-500 border-red-500 text-white hover:bg-red-600 animate-pulse"
                          : audioProcessing
                          ? "bg-muted border-border text-muted-foreground cursor-wait"
                          : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent/10"
                      }`}
                      title={isRecording ? "Parar gravação" : "Gravar agendamento por áudio"}
                    >
                      {isRecording ? <Square className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                    </button>
                    {isRecording && (
                      <span className="text-xs font-mono text-red-500 tabular-nums w-8">
                        {MAX_RECORDING_SECONDS - recordingSeconds}s
                      </span>
                    )}
                  </div>
                  <div className="flex items-center rounded-md border border-border p-0.5 bg-muted/40 h-7">
                    <button
                      onClick={() => handleSetViewMode("list")}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <List className="h-3 w-3" />
                      <span className="hidden sm:inline">Lista</span>
                    </button>
                    <button
                      onClick={() => handleSetViewMode("agenda")}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${viewMode === "agenda" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <CalendarDays className="h-3 w-3" />
                      <span className="hidden sm:inline">Agenda</span>
                    </button>
                    <button
                      onClick={() => handleSetViewMode("calendar")}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${viewMode === "calendar" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <LayoutGrid className="h-3 w-3" />
                      <span className="hidden sm:inline">Grade</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          }
        />

        {showWhatsAppUpsell && (
          <div className="border border-amber-400 bg-amber-50 dark:bg-amber-950/20 rounded-xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 relative">
            <button
              onClick={dismissUpsell}
              className="absolute top-3 right-3 text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-start gap-3 flex-1 min-w-0 pr-6 sm:pr-0">
              <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <MessageCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <p className="font-bold text-sm text-amber-900 dark:text-amber-200 leading-snug">
                  Seus clientes ainda não estão recebendo lembrete
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  Com o plano Pro, cada agendamento gera um lembrete automático pelo WhatsApp. Sem você fazer nada.
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  {weekAppointmentsCount > 0
                    ? `Esta semana você criou ${weekAppointmentsCount} agendamento${weekAppointmentsCount > 1 ? "s" : ""} — todos poderiam ter sido confirmados automaticamente.`
                    : "Todos os seus agendamentos desta semana poderiam ter sido confirmados automaticamente."}
                </p>
              </div>
            </div>
            <Button
              asChild
              size="sm"
              className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white border-0 self-start sm:self-auto"
            >
              <Link href="/subscription">Ativar WhatsApp automático</Link>
            </Button>
          </div>
        )}

        {/* Resultado de transcrição de áudio */}
        {audioProcessing && (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground animate-pulse">
            <Mic className="h-4 w-4 shrink-0" />
            Transcrevendo áudio com IA...
          </div>
        )}

        {transcriptionResult && !audioProcessing && (
          <div className="relative rounded-xl border border-primary/30 bg-primary/5 px-4 py-4 flex flex-col gap-3">
            <button
              onClick={() => setTranscriptionResult(null)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Mic className="h-4 w-4 text-primary" />
              Agendamento detectado no áudio
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {transcriptionResult.nome_do_cliente && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Cliente</span>
                  <span className="font-medium">{transcriptionResult.nome_do_cliente}</span>
                </div>
              )}
              {transcriptionResult.servico && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Serviço</span>
                  <span className="font-medium">{transcriptionResult.servico}</span>
                </div>
              )}
              {transcriptionResult.valor != null && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Valor</span>
                  <span className="font-medium">
                    {Number(transcriptionResult.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>
              )}
              {transcriptionResult.duracao != null && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Duração</span>
                  <span className="font-medium">{transcriptionResult.duracao} min</span>
                </div>
              )}
              {transcriptionResult.dia_marcado && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Data</span>
                  <span className="font-medium">
                    {format(new Date(transcriptionResult.dia_marcado + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
              )}
              {transcriptionResult.horario && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Horário</span>
                  <span className="font-medium">{transcriptionResult.horario}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" asChild>
                <Link href={buildAppointmentUrl()}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Criar Agendamento
                </Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setTranscriptionResult(null)}>
                Descartar
              </Button>
            </div>
          </div>
        )}

        {viewMode === "calendar" ? (
          <CalendarWeekView
            weekStart={calendarWeek}
            appointments={calendarItems}
            businessHours={businessHours}
            calStartHour={calStartHour}
            calEndHour={calEndHour}
            onSlotClick={(date, hour, minute) => {
              openQuickCreate(date, hour, minute)
            }}
            onStatusChange={updateAppointmentStatus}
          />
        ) : viewMode === "agenda" ? (
          <AgendaDayView
            day={agendaDay}
            appointments={calendarItems}
            businessHours={businessHours}
            calStartHour={calStartHour}
            calEndHour={calEndHour}
            onSlotClick={openQuickCreate}
            onStatusChange={updateAppointmentStatus}
          />
        ) : (
        <>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou serviço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {!isLoading && totalCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">{totalCount} registro{totalCount !== 1 ? "s" : ""}</p>
              <span className="text-muted-foreground/40 text-sm">·</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-muted-foreground">Por página:</span>
                <div className="flex items-center gap-1">
                  {[5, 10, 20, 25, 50].map((n) => (
                    <button
                      key={n}
                      onClick={() => setPageSize(n)}
                      className={`h-7 min-w-8 px-1.5 rounded text-xs font-medium transition-colors ${
                        pageSize === n
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
                <span className="text-sm">Página {page} de {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <ListSkeleton type="cards" count={5} />
        ) : finalFiltered.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={search ? "Nenhum resultado encontrado" : "Nenhum agendamento encontrado"}
            description={search ? "Tente buscar por outro termo." : "Comece agendando seu primeiro horário."}
            action={!search ? (
              <Button asChild size="sm">
                <Link href="/appointments/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Agendar Horário
                </Link>
              </Button>
            ) : undefined}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {finalFiltered.map((apt) => {
                const date = new Date(apt.scheduledDateTime)

                return (
                  <Link key={apt.id} href={`/appointments/${apt.id}`}>
                    <Card className="transition-colors hover:bg-accent/10">
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                          <span className="text-xs font-bold uppercase leading-none">
                            {format(date, "MMM", { locale: ptBR })}
                          </span>
                          <span className="text-lg font-bold leading-tight">
                            {format(date, "dd")}
                          </span>
                        </div>

                        <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-bold text-foreground">
                              {apt.clientName}
                            </span>
                            {new Date(apt.scheduledDateTime) < new Date() && (apt.status === 0 || apt.status === 1) && (
                              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">
                                Atrasado
                              </span>
                            )}
                            <StatusDropdown appointmentId={apt.id} currentStatus={apt.status} onStatusChange={updateAppointmentStatus} />
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1 font-medium text-primary">
                              <Clock className="h-3 w-3" />
                              {format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} ({apt.durationMinutes} min)
                            </span>
                            {(apt.serviceName || apt.description) && isModuleEnabled(3) && (
                              <span className="flex items-center gap-1">
                                <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                                {apt.serviceName || apt.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              }
            )}
          </div>
        )}

        {(totalPages > 1 || totalCount > 0) && (
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">{totalCount} registro{totalCount !== 1 ? "s" : ""}</p>
              <span className="text-muted-foreground/40 text-sm">·</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-muted-foreground">Por página:</span>
                <div className="flex items-center gap-1">
                  {[5, 10, 20, 25, 50].map((n) => (
                    <button
                      key={n}
                      onClick={() => setPageSize(n)}
                      className={`h-7 min-w-8 px-1.5 rounded text-xs font-medium transition-colors ${
                        pageSize === n
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </Button>
                <span className="text-sm">Página {page} de {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próxima
                </Button>
              </div>
            )}
          </div>
        )}
        </>
        )}
      </div>

      {/* ── Dialog Atrasados ────────────────────────────────────────────────── */}
      <Dialog open={showOverdueModal} onOpenChange={setShowOverdueModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              Agendamentos sem atualização
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Os agendamentos abaixo já passaram e ainda estão como pendente ou confirmado.
            </p>
          </DialogHeader>

          <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto py-1 pr-1">
            {overdueItems.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <Check className="h-6 w-6 text-emerald-600" />
                </div>
                <p className="text-sm font-semibold text-foreground">Tudo certo!</p>
                <p className="text-xs text-muted-foreground">Nenhum agendamento pendente.</p>
              </div>
            ) : (
              overdueItems.map((apt) => {
                const date = new Date(apt.scheduledDateTime)
                const isUpdating = updatingOverdueId === apt.id
                return (
                  <div key={apt.id} className="flex flex-col gap-2 rounded-xl border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/40 dark:bg-amber-900/10 p-3">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-semibold text-foreground truncate">{apt.clientName}</span>
                      <span className="text-xs text-muted-foreground truncate">{apt.serviceName || apt.description || "Sem serviço"}</span>
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        className="h-7 text-xs flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={isUpdating}
                        onClick={() => handleOverdueStatusUpdate(apt.id, 2)}
                      >
                        {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Concluído"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs flex-1 border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        disabled={isUpdating}
                        onClick={() => handleOverdueStatusUpdate(apt.id, 3)}
                      >
                        {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Cancelado"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs flex-1 border-orange-200 dark:border-orange-900/60 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                        disabled={isUpdating}
                        onClick={() => handleOverdueStatusUpdate(apt.id, 4)}
                      >
                        {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Faltou"}
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" className="w-full" onClick={() => setShowOverdueModal(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AuthGuard>
    </>
  )
}
