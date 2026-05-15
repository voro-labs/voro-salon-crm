"use client"

import { Info, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { KANBAN_COLUMNS } from "./funnel-data"

interface LegendModalProps {
  onClose: () => void
}

export function LegendModal({ onClose }: LegendModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            <h2 className="font-bold text-sm text-foreground">Legenda das Colunas</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 flex flex-col gap-2">
          {KANBAN_COLUMNS.map((col) => (
            <div key={col.state} className="flex items-start gap-3 p-2.5 rounded-lg border border-border/50">
              <div className={cn("shrink-0 rounded-md px-2 py-1 text-[10px] font-bold whitespace-nowrap", col.headerColor)}>
                {col.label}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">{col.description}</p>
            </div>
          ))}
          <div className="mt-2 pt-3 border-t border-border/50">
            <p className="text-xs font-semibold text-foreground mb-2">Canais de origem</p>
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-bold px-2 py-1 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200">Bot — WhatsApp</span>
              <span className="text-[10px] font-bold px-2 py-1 rounded-full border bg-blue-100 text-blue-700 border-blue-200">App — Aplicativo mobile</span>
              <span className="text-[10px] font-bold px-2 py-1 rounded-full border bg-violet-100 text-violet-700 border-violet-200">Site — Booking online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
