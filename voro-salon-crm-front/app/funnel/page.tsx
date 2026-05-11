"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { LayoutGrid, Loader2, RefreshCw, Info, X, Rows3 } from "lucide-react"
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
  funnelState?: string
  sessionId?: string
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

// ─── Visitor group card ───────────────────────────────────────────────────────

function VisitorGroupCard({ visitors }: { visitors: KanbanAppointment[] }) {
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

// ─── Kanban config ───────────────────────────────────────────────────────────

const KANBAN_COLUMNS: { state: string; label: string; color: string; headerColor: string; description: string }[] = [
  { state: "START",                  label: "Novo Contato",            color: "border-slate-300",   headerColor: "bg-slate-100 text-slate-700",   description: "Visitante acabou de iniciar o fluxo de agendamento." },
  { state: "AWAITING_TENANT",        label: "Escolhendo Unidade",      color: "border-zinc-300",    headerColor: "bg-zinc-100 text-zinc-700",     description: "Está escolhendo qual unidade/estabelecimento quer atender." },
  { state: "AWAITING_SERVICE",       label: "Escolhendo Serviço",      color: "border-blue-300",    headerColor: "bg-blue-100 text-blue-700",     description: "Está selecionando o serviço desejado." },
  { state: "AWAITING_EMPLOYEE",      label: "Escolhendo Profissional", color: "border-violet-300",  headerColor: "bg-violet-100 text-violet-700", description: "Está escolhendo com qual profissional quer ser atendido." },
  { state: "AWAITING_DATE",          label: "Escolhendo Data",         color: "border-amber-300",   headerColor: "bg-amber-100 text-amber-700",   description: "Está navegando pelo calendário para escolher a data." },
  { state: "AWAITING_TIME",          label: "Escolhendo Horário",      color: "border-orange-300",  headerColor: "bg-orange-100 text-orange-700", description: "Está selecionando o horário disponível na data escolhida." },
  { state: "AWAITING_DESCRIPTION",   label: "Aguardando Descrição",    color: "border-purple-300",  headerColor: "bg-purple-100 text-purple-700", description: "Está preenchendo informações complementares (nome, observações)." },
  { state: "AWAITING_CONFIRMATION",  label: "Aguardando Confirmação",  color: "border-rose-300",    headerColor: "bg-rose-100 text-rose-700",     description: "Revisando o resumo do agendamento antes de confirmar." },
  { state: "AWAITING_REMINDER_TIME", label: "Definindo Lembrete",      color: "border-indigo-300",  headerColor: "bg-indigo-100 text-indigo-700", description: "Configurando quando quer receber o lembrete do agendamento." },
  { state: "COMPLETED",              label: "Agendado",                color: "border-emerald-300", headerColor: "bg-emerald-100 text-emerald-700", description: "Agendamento criado com sucesso via Bot, App ou Site." },
  { state: "ABANDONED",              label: "Abandonado",              color: "border-yellow-300",  headerColor: "bg-yellow-100 text-yellow-700",  description: "Visitante iniciou mas não completou o agendamento (sessão expirou)." },
  { state: "CANCELLED",              label: "Cancelado",               color: "border-gray-300",    headerColor: "bg-gray-100 text-gray-700",     description: "Agendamento cancelado pelo cliente ou estabelecimento." },
]

// ─── Legend modal ─────────────────────────────────────────────────────────────

function LegendModal({ onClose }: { onClose: () => void }) {
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FunnelPage() {
  const [showAll, setShowAll] = useState(false)
  const [showLegend, setShowLegend] = useState(false)
  const [showAbandoned, setShowAbandoned] = useState(false)

  const { data: kanbanAppointments, isLoading, mutate } = useSWR<KanbanAppointment[]>(
    API_CONFIG.ENDPOINTS.FUNNEL_APPOINTMENTS,
    fetcher,
    { refreshInterval: 60000 }
  )

  const totalCount = (kanbanAppointments ?? []).length

  return (
    <AuthGuard requiredRoles={["SalonOwner", "Owner"]}>
      <ModuleGuard moduleId={[8, 9]}>
        <div className="flex flex-col gap-6 p-4 sm:p-6 md:px-10">
          <PageHeader
            title="Funil de Agendamentos"
            description="Acompanhe os agendamentos por canal de origem."
            action={
              <div className="flex flex-wrap items-center gap-2 justify-end">
                {/* Toggle: colunas com itens vs todas */}
                <div className="flex items-center rounded-lg border border-border p-0.5 bg-muted/40">
                  <button
                    onClick={() => setShowAll(false)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-colors",
                      !showAll ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <LayoutGrid className="h-3 w-3" />
                    Com itens
                  </button>
                  <button
                    onClick={() => setShowAll(true)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-colors",
                      showAll ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Rows3 className="h-3 w-3" />
                    Todas
                  </button>
                </div>

                <button
                  onClick={() => setShowAbandoned(v => !v)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-medium transition-colors",
                    showAbandoned
                      ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                      : "bg-muted/40 text-muted-foreground border-border hover:text-foreground"
                  )}
                >
                  Abandonados
                </button>

                <Button variant="outline" size="sm" onClick={() => setShowLegend(true)} title="Abrir legenda">
                  <Info className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Legenda</span>
                </Button>

                <Button variant="outline" size="sm" onClick={() => mutate()} title="Atualizar dados">
                  <RefreshCw className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Atualizar</span>
                </Button>
              </div>
            }
          />

          {isLoading ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Carregando agendamentos...
            </div>
          ) : totalCount === 0 && !showAll ? (
            <div className="flex flex-col items-center justify-center py-24 text-center border rounded-xl border-dashed">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <LayoutGrid className="h-7 w-7 text-primary" />
              </div>
              <p className="font-semibold">Nenhum agendamento no funil</p>
              <p className="text-sm text-muted-foreground mt-1">
                Os agendamentos originados pelo Bot, App ou Site aparecerão aqui.
              </p>
              <button
                onClick={() => setShowAll(true)}
                className="mt-3 text-xs text-primary underline underline-offset-2"
              >
                Ver todas as colunas
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-3 min-w-max">
                {KANBAN_COLUMNS.map((col) => {
                  const items = (kanbanAppointments ?? []).filter((a) => {
                    if (a.funnelState) return a.funnelState === col.state
                    if (col.state === "COMPLETED") return a.status === 1 || a.status === 2
                    if (col.state === "CANCELLED") return a.status === 3 || a.status === 4
                    return false
                  })

                  const alwaysShow = col.state === "COMPLETED" || col.state === "CANCELLED"
                  if (col.state === "ABANDONED" && !showAbandoned) return null
                  if (!showAll && !alwaysShow && items.length === 0) return null

                  return (
                    <div
                      key={col.state}
                      className={cn("flex flex-col gap-3 w-56 shrink-0 rounded-xl border-2 p-3", col.color)}
                    >
                      <div className={cn("flex items-center justify-between rounded-lg px-2.5 py-1.5", col.headerColor)}>
                        <span className="text-xs font-semibold">{col.label}</span>
                        <span className="text-xs font-bold tabular-nums">{items.length}</span>
                      </div>

                      {(() => {
                        const namedItems = items.filter(a => a.clientName !== "Visitante")
                        const visitors = items.filter(a => a.clientName === "Visitante")
                        const isEmpty = namedItems.length === 0 && visitors.length === 0
                        return (
                          <div className="flex flex-col gap-2 min-h-15">
                            {isEmpty ? (
                              <p className="text-[11px] text-muted-foreground text-center py-4">Nenhum agendamento</p>
                            ) : (
                              <>
                                {namedItems.map((apt) => (
                                  <AppointmentKanbanCard key={apt.id ?? apt.sessionId} apt={apt} />
                                ))}
                                {visitors.length > 0 && (
                                  <VisitorGroupCard visitors={visitors} />
                                )}
                              </>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {showLegend && <LegendModal onClose={() => setShowLegend(false)} />}
      </ModuleGuard>
    </AuthGuard>
  )
}
