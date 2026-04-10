"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { LayoutGrid, Loader2, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { API_CONFIG } from "@/lib/api"
import { fetcher } from "@/lib/fetcher"
import { AuthGuard } from "@/components/auth/auth.guard"
import { ModuleGuard } from "@/components/auth/module-guard"
import { PageHeader } from "@/components/ui/custom/page-header"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────────────────────

interface KanbanAppointment {
  id: string
  clientName: string
  clientPhone?: string
  serviceName?: string
  scheduledDateTime: string
  durationMinutes: number
  status: number
  amount: number
  source: number // 1=WhatsAppBot 2=App 3=Website
  employeeName?: string
}

// ─── Source badge ────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: number }) {
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

// ─── Appointment kanban card ──────────────────────────────────────────────────

function AppointmentKanbanCard({ apt }: { apt: KanbanAppointment }) {
  const router = useRouter()
  return (
    <div
      onClick={() => router.push(`/appointments/${apt.id}`)}
      className="flex flex-col gap-1.5 p-3 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-center justify-between gap-1 min-w-0">
        <p className="text-xs font-semibold truncate min-w-0">{apt.clientName}</p>
        <SourceBadge source={apt.source} />
      </div>
      {apt.serviceName && (
        <p className="text-[11px] text-muted-foreground truncate">{apt.serviceName}</p>
      )}
      <p className="text-[10px] text-muted-foreground font-mono">
        {format(new Date(apt.scheduledDateTime), "dd/MM HH:mm", { locale: ptBR })}
      </p>
    </div>
  )
}

// ─── Kanban config ───────────────────────────────────────────────────────────

const KANBAN_COLUMNS: { state: string; label: string; color: string; headerColor: string }[] = [
  { state: "START",                  label: "Novo Contato",            color: "border-slate-300",   headerColor: "bg-slate-100 text-slate-700" },
  { state: "AWAITING_TENANT",        label: "Escolhendo Unidade",      color: "border-zinc-300",    headerColor: "bg-zinc-100 text-zinc-700" },
  { state: "AWAITING_SERVICE",       label: "Escolhendo Serviço",      color: "border-blue-300",    headerColor: "bg-blue-100 text-blue-700" },
  { state: "AWAITING_EMPLOYEE",      label: "Escolhendo Profissional", color: "border-violet-300",  headerColor: "bg-violet-100 text-violet-700" },
  { state: "AWAITING_DATE",          label: "Escolhendo Data",         color: "border-amber-300",   headerColor: "bg-amber-100 text-amber-700" },
  { state: "AWAITING_TIME",          label: "Escolhendo Horário",      color: "border-orange-300",  headerColor: "bg-orange-100 text-orange-700" },
  { state: "AWAITING_DESCRIPTION",   label: "Aguardando Descrição",    color: "border-purple-300",  headerColor: "bg-purple-100 text-purple-700" },
  { state: "AWAITING_CONFIRMATION",  label: "Aguardando Confirmação",  color: "border-rose-300",    headerColor: "bg-rose-100 text-rose-700" },
  { state: "AWAITING_REMINDER_TIME", label: "Definindo Lembrete",      color: "border-indigo-300",  headerColor: "bg-indigo-100 text-indigo-700" },
  { state: "COMPLETED",              label: "Agendado",                color: "border-emerald-300", headerColor: "bg-emerald-100 text-emerald-700" },
  { state: "CANCELLED",              label: "Cancelado",               color: "border-gray-300",    headerColor: "bg-gray-100 text-gray-700" },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FunnelPage() {
  const { data: kanbanAppointments, isLoading, mutate } = useSWR<KanbanAppointment[]>(
    API_CONFIG.ENDPOINTS.WHATSAPP_KANBAN_APPOINTMENTS,
    fetcher,
    { refreshInterval: 60000 }
  )

  const getColumnAppointments = (state: string) => {
    if (state === "COMPLETED") {
      return (kanbanAppointments ?? []).filter((a) => a.status === 1 || a.status === 2)
    }
    // For non-completed columns we show nothing — the funnel endpoint only returns scheduled/confirmed
    return []
  }

  const totalCount = (kanbanAppointments ?? []).length

  return (
    <AuthGuard requiredRoles={["SalonOwner", "Owner"]}>
      <ModuleGuard moduleId={9}>
        <div className="flex flex-col gap-6 p-4 sm:p-6">
          <PageHeader
            title="Funil de Agendamentos"
            description="Acompanhe os agendamentos por canal de origem."
            action={
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => mutate()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Atualizar
                </Button>
              </div>
            }
          />

          {isLoading ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Carregando agendamentos...
            </div>
          ) : totalCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center border rounded-xl border-dashed">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <LayoutGrid className="h-7 w-7 text-primary" />
              </div>
              <p className="font-semibold">Nenhum agendamento no funil</p>
              <p className="text-sm text-muted-foreground mt-1">
                Os agendamentos originados pelo Bot, App ou Site aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-3 min-w-max">
                {KANBAN_COLUMNS.map((col) => {
                  const items = (kanbanAppointments ?? []).filter((a) => {
                    // Map appointment status numbers to column states
                    if (col.state === "COMPLETED") return a.status === 1 || a.status === 2
                    if (col.state === "CANCELLED") return a.status === 3 || a.status === 4
                    return false
                  })

                  // Only render columns that have items, or always render COMPLETED and CANCELLED
                  const alwaysShow = col.state === "COMPLETED" || col.state === "CANCELLED"
                  if (!alwaysShow && items.length === 0) return null

                  return (
                    <div
                      key={col.state}
                      className={cn("flex flex-col gap-3 w-56 shrink-0 rounded-xl border-2 p-3", col.color)}
                    >
                      <div className={cn("flex items-center justify-between rounded-lg px-2.5 py-1.5", col.headerColor)}>
                        <span className="text-xs font-semibold">{col.label}</span>
                        <span className="text-xs font-bold tabular-nums">{items.length}</span>
                      </div>

                      <div className="flex flex-col gap-2 min-h-15">
                        {items.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground text-center py-4">Nenhum agendamento</p>
                        ) : (
                          items.map((apt) => (
                            <AppointmentKanbanCard key={apt.id} apt={apt} />
                          ))
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </ModuleGuard>
    </AuthGuard>
  )
}
