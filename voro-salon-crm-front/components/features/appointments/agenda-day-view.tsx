"use client"

import { useRouter } from "next/navigation"
import { isSameDay } from "date-fns"
import { StatusDropdown } from "@/components/ui/custom/status-badge"
import { BusinessHoursDay, STATUS_COLORS } from "./appointments.types"

interface AgendaDayViewProps {
  day: Date
  appointments: any[]
  businessHours?: BusinessHoursDay[]
  calStartHour: number
  calEndHour: number
  onSlotClick: (date: Date, hour: number, minute: number) => void
  onStatusChange: (appointmentId: string, newStatus: number) => void
}

type SlotInfo =
  | { type: "appointment"; apt: any }
  | { type: "continuation"; apt: any }
  | { type: "empty" }

export function AgendaDayView({
  day,
  appointments,
  businessHours,
  calStartHour,
  calEndHour,
  onSlotClick,
  onStatusChange,
}: AgendaDayViewProps) {
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
