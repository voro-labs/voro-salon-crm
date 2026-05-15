"use client"

import { cn } from "@/lib/utils"

export function SourceBadge({ source }: { source: number }) {
  const config: Record<number, { label: string; className: string }> = {
    1: { label: "Bot", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    2: { label: "App", className: "bg-blue-100 text-blue-700 border-blue-200" },
    3: { label: "Site", className: "bg-violet-100 text-violet-700 border-violet-200" },
  }
  const c = config[source]
  if (!c) return null
  return (
    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0", c.className)}>
      {c.label}
    </span>
  )
}
