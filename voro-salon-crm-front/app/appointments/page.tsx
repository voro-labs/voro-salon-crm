"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import Link from "next/link"
import { Plus, Search, Calendar, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format, isToday, isWithinInterval, addDays, startOfDay, endOfDay } from "date-fns"
import { ptBR } from "date-fns/locale"

import { API_CONFIG } from "@/lib/api"
import { AuthGuard } from "@/components/auth/auth.guard"

import { useDataList } from "@/hooks/use-data-list.hook"
import { PageHeader } from "@/components/ui/custom/page-header"
import { EmptyState } from "@/components/ui/custom/empty-state"
import { ListSkeleton } from "@/components/ui/custom/list-skeleton"
import { StatusBadge } from "@/components/ui/custom/status-badge"
import { fetcher } from "@/lib/fetcher"

export default function AppointmentsPage() {
  const [periodFilter, setPeriodFilter] = useState("today")
  const { data: modules } = useSWR(API_CONFIG.ENDPOINTS.TENANT_MODULES, fetcher)

  const { filteredData: searchFiltered, isLoading, search, setSearch } = useDataList(
    API_CONFIG.ENDPOINTS.APPOINTMENTS,
    (a: any, q: string) =>
      a.clientName.toLowerCase().includes(q) ||
      (a.serviceName && a.serviceName.toLowerCase().includes(q)) ||
      (a.description && a.description.toLowerCase().includes(q))
  )

  const isModuleEnabled = (moduleId: number) => {
    return modules?.find((m: any) => m.module === moduleId)?.isEnabled ?? true
  }

  const finalFiltered = useMemo(() => {
    let result = searchFiltered
    const now = new Date()

    // Period filter
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
  }, [searchFiltered, periodFilter])

  return (
    <AuthGuard requiredRoles={["User"]}>
      <div className="flex flex-col gap-6 p-6">
        <PageHeader 
          title="Agendamentos" 
          action={
            <div className="flex items-center gap-2">
              <Tabs value={periodFilter} onValueChange={setPeriodFilter} className="w-fit">
                <TabsList className="bg-muted/50 border border-border/40 h-8 p-0.5">
                  <TabsTrigger value="today" className="text-[10px] h-7 px-3">Hoje</TabsTrigger>
                  <TabsTrigger value="week" className="text-[10px] h-7 px-3">Semana</TabsTrigger>
                  <TabsTrigger value="all" className="text-[10px] h-7 px-3">Tudo</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button asChild size="sm">
                <Link href="/appointments/new">
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Novo Agendamento</span>
                  <span className="sm:hidden">Novo</span>
                </Link>
              </Button>
            </div>
          } 
        />

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
      </div>
    </AuthGuard>
  )
}
