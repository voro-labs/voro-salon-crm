"use client"

import { useState, useMemo, useEffect } from "react"
import useSWR from "swr"
import Link from "next/link"
import { Plus, Search, Calendar, Clock, Lock, MessageCircle, Ban, X } from "lucide-react"
import { ExportMenu } from "@/components/ui/custom/export-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format, isToday, isWithinInterval, addDays, startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns"
import { ptBR } from "date-fns/locale"

import { API_CONFIG } from "@/lib/api"
import { AuthGuard } from "@/components/auth/auth.guard"
import { useAuth } from "@/contexts/auth.context"

import { useDataList } from "@/hooks/use-data-list.hook"
import { useSubscription } from "@/hooks/use-subscription.hook"
import { PageHeader } from "@/components/ui/custom/page-header"
import { EmptyState } from "@/components/ui/custom/empty-state"
import { ListSkeleton } from "@/components/ui/custom/list-skeleton"
import { StatusBadge } from "@/components/ui/custom/status-badge"
import { fetcher } from "@/lib/fetcher"

export default function AppointmentsPage() {
  const [periodFilter, setPeriodFilter] = useState("today")

  const {
    items,
    totalCount,
    totalPages,
    page,
    setPage,
    search,
    setSearch,
    isLoading,
  } = useDataList(API_CONFIG.ENDPOINTS.APPOINTMENTS, { pageSize: 20 })

  const { data: modules } = useSWR(API_CONFIG.ENDPOINTS.TENANT_MODULES, fetcher)
  const { plan } = useSubscription()
  const { user } = useAuth()
  const isSalonEmployee = user?.roles?.some((r: any) => r.name === "SalonEmployee") ?? false

  // If there are no appointments today in the current page, show week automatically
  useEffect(() => {
    if (isLoading) return
    const hasToday = items.some((a: any) => isToday(new Date(a.scheduledDateTime)))
    if (!hasToday) setPeriodFilter("week")
  }, [isLoading])

  const isModuleEnabled = (moduleId: number) => {
    return modules?.find((m: any) => m.module === moduleId)?.isEnabled ?? true
  }

  const weekAppointmentsCount = useMemo(() => {
    const now = new Date()
    const weekStart = startOfWeek(now, { locale: ptBR })
    const weekEnd = endOfWeek(now, { locale: ptBR })
    return items.filter((a: any) => {
      const d = new Date(a.scheduledDateTime)
      return isWithinInterval(d, { start: weekStart, end: weekEnd })
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

  // Client-side period filter applied on top of the server-paginated results
  const finalFiltered = useMemo(() => {
    let result = items
    const now = new Date()

    if (periodFilter === "today") {
      result = result.filter((a: any) => isToday(new Date(a.scheduledDateTime)))
    } else if (periodFilter === "week") {
      result = result.filter((a: any) =>
        isWithinInterval(new Date(a.scheduledDateTime), {
          start: startOfDay(now),
          end: endOfDay(addDays(now, 7)),
        })
      )
    }

    return result.sort(
      (a: any, b: any) =>
        new Date(a.scheduledDateTime).getTime() -
        new Date(b.scheduledDateTime).getTime()
    )
  }, [items, periodFilter])

  return (
    <AuthGuard requiredRoles={["SalonOwner", "SalonEmployee", "Owner"]}>
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Agendamentos"
          action={
            <div className="flex flex-col gap-2 w-full">
              {/* Linha 2: ações — ícone-only nos secundários em mobile */}
              <div className="flex flex-wrap items-center gap-1.5 justify-between sm:justify-start">
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
              {/* Linha 1: filtro de período */}
              <div className="flex justify-end w-full">
                <Tabs value={periodFilter} onValueChange={setPeriodFilter}>
                  <TabsList className="w-full sm:w-fit bg-muted/50 border border-border/40 h-8 p-0.5">
                    <TabsTrigger value="today" className="flex-1 sm:flex-none text-[10px] h-7 px-3">Hoje</TabsTrigger>
                    <TabsTrigger value="week" className="flex-1 sm:flex-none text-[10px] h-7 px-3">Semana</TabsTrigger>
                    <TabsTrigger value="all" className="flex-1 sm:flex-none text-[10px] h-7 px-3">Tudo</TabsTrigger>
                  </TabsList>
                </Tabs>
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

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou serviço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

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
            {finalFiltered.map(
              (apt: {
                id: string
                clientName: string
                serviceName?: string
                scheduledDateTime: string
                durationMinutes: number
                status: number
                amount: number
              }) => {
                const date = new Date(apt.scheduledDateTime)

                return (
                  <Link key={apt.id} href={`/appointments/${apt.id}`}>
                    <Card className="transition-colors hover:bg-accent/10">
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                          <span className="text-[10px] font-bold uppercase leading-none">
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
                            <StatusBadge status={apt.status} />
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1 font-medium text-primary">
                              <Clock className="h-3 w-3" />
                              {format(date, "HH:mm")} ({apt.durationMinutes} min)
                            </span>
                            {apt.serviceName && isModuleEnabled(3) && (
                              <span className="flex items-center gap-1">
                                <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                                {apt.serviceName}
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">{totalCount} registros</p>
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
          </div>
        )}
      </div>
    </AuthGuard>
  )
}
