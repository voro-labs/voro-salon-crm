"use client"

import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { SourceBadge } from "./source-badge"
import type { KanbanAppointment } from "./funnel.types"

export function AppointmentKanbanCard({ apt }: { apt: KanbanAppointment }) {
  const router = useRouter()
  return (
    <div
      onClick={() => apt.sessionId ? undefined : router.push(`/appointments/${apt.id}`)}
      className={cn(
        "flex flex-col gap-1.5 p-3 rounded-xl border border-border bg-card shadow-sm transition-shadow",
        !apt.sessionId && "cursor-pointer hover:shadow-md"
      )}
    >
      <div className="flex items-center justify-between gap-1 min-w-0">
        <p className="text-xs font-semibold truncate min-w-0">{apt.clientName}</p>
        <SourceBadge source={apt.source} />
      </div>
      {apt.serviceName && (
        <p className="text-[11px] text-muted-foreground truncate">{apt.serviceName}</p>
      )}
      {apt.scheduledDateTime ? (
        <p className="text-[10px] text-muted-foreground font-mono">
          {format(new Date(apt.scheduledDateTime), "dd/MM HH:mm", { locale: ptBR })}
        </p>
      ) : (
        <p className="text-[10px] text-muted-foreground italic">Em andamento...</p>
      )}
    </div>
  )
}
