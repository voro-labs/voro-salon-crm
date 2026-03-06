"use client"

import { useState, useCallback } from "react"
import useSWR from "swr"
import Link from "next/link"
import { Plus, Search, Calendar, User, Clock, CheckCircle2, Circle, XCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format, isToday, isWithinInterval, addDays, startOfDay, endOfDay } from "date-fns"
import { ptBR } from "date-fns/locale"

import { API_CONFIG, secureApiCall } from "@/lib/api"
import { AuthGuard } from "@/components/auth/auth.guard"

const fetcher = async (url: string) => {
  const result = await secureApiCall<any>(url, { method: "GET" })
  if (result.hasError) throw new Error(result.message || "Error")
  return result.data
}

const statusConfig: Record<number, { label: string; color: string; icon: any }> = {
  0: { label: "Pendente", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Circle },
  1: { label: "Confirmado", color: "bg-blue-100 text-blue-800 border-blue-200", icon: Calendar },
  2: { label: "Concluído", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
  3: { label: "Cancelado", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
  4: { label: "Faltou", color: "bg-gray-100 text-gray-800 border-gray-200", icon: AlertCircle },
}

export default function AppointmentsPage() {
  const [search, setSearch] = useState("")
  const [periodFilter, setPeriodFilter] = useState("today")
  const { data, isLoading } = useSWR(API_CONFIG.ENDPOINTS.APPOINTMENTS, fetcher)
  const { data: modules } = useSWR(API_CONFIG.ENDPOINTS.TENANT_MODULES, fetcher)

  const isModuleEnabled = (moduleId: number) => {
    return modules?.find((m: any) => m.module === moduleId)?.isEnabled ?? true
  }

  const appointments = data ?? []

  const filtered = useCallback(() => {
    let result = appointments
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

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (a: { clientName: string; serviceName?: string; description?: string }) =>
          a.clientName.toLowerCase().includes(q) ||
          (a.serviceName && a.serviceName.toLowerCase().includes(q)) ||
          (a.description && a.description.toLowerCase().includes(q))
      )
    }

    return result.sort(
      (a: any, b: any) =>
        new Date(a.scheduledDateTime).getTime() -
        new Date(b.scheduledDateTime).getTime()
    )
  }, [search, appointments, periodFilter])

  return (
    <AuthGuard requiredRoles={["User"]}>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Agendamentos</h1>
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
        </div>

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
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-48 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered().length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold text-foreground">
                {search ? "Nenhum resultado encontrado" : "Nenhum agendamento encontrado"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {search
                  ? "Tente buscar por outro termo."
                  : "Comece agendando seu primeiro horário."}
              </p>
              {!search && (
                <Button asChild className="mt-4" size="sm">
                  <Link href="/appointments/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Agendar Horário
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered().map(
              (apt: {
                id: string
                clientName: string
                serviceName?: string
                scheduledDateTime: string
                durationMinutes: number
                status: number
                amount: number
              }) => {
                const config = statusConfig[apt.status] || statusConfig[0]
                const StatusIcon = config.icon
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
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${config.color}`}>
                              <StatusIcon className="mr-1 h-3 w-3" />
                              {config.label}
                            </Badge>
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
