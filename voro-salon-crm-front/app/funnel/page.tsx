"use client"

import { useState } from "react"
import useSWR from "swr"
import { LayoutGrid, Loader2, RefreshCw, Info, Rows3 } from "lucide-react"
import { API_CONFIG } from "@/lib/api"
import { fetcher } from "@/lib/fetcher"
import { AuthGuard } from "@/components/auth/auth.guard"
import { ModuleGuard } from "@/components/auth/module-guard"
import { PageHeader } from "@/components/ui/custom/page-header"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { KANBAN_COLUMNS } from "@/components/features/funnel/funnel-data"
import { AppointmentKanbanCard } from "@/components/features/funnel/appointment-kanban-card"
import { VisitorGroupCard } from "@/components/features/funnel/visitor-group-card"
import { LegendModal } from "@/components/features/funnel/legend-modal"
import type { KanbanAppointment } from "@/components/features/funnel/funnel.types"

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
