"use client"

import { cn } from "@/lib/utils"
import type { KanbanAppointment } from "./funnel.types"

export function VisitorGroupCard({ visitors }: { visitors: KanbanAppointment[] }) {
  const bySource = visitors.reduce<Record<number, number>>((acc, v) => {
    acc[v.source] = (acc[v.source] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-dashed border-border bg-muted/30 shadow-sm">
      <div className="flex items-center justify-between gap-1">
        <p className="text-xs font-semibold text-muted-foreground">
          {visitors.length} visitante{visitors.length > 1 ? "s" : ""} anônimo{visitors.length > 1 ? "s" : ""}
        </p>
      </div>
      <div className="flex flex-wrap gap-1">
        {Object.entries(bySource).map(([src, count]) => {
          const source = Number(src)
          const labels: Record<number, { label: string; className: string }> = {
            1: { label: "Bot", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
            2: { label: "App", className: "bg-blue-100 text-blue-700 border-blue-200" },
            3: { label: "Site", className: "bg-violet-100 text-violet-700 border-violet-200" },
          }
          const cfg = labels[source]
          if (!cfg) return null
          return (
            <span key={src} className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0", cfg.className)}>
              {count}× {cfg.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}
