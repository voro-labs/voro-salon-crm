"use client"

import { useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { MetricCard } from "@/components/metric-card"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  DollarSign,
  CalendarDays,
  Users,
  TrendingUp,
  Plus,
  Clock,
  CheckCircle2,
  Circle,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronRight
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
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
  1: { label: "Confirmado", color: "bg-blue-100 text-blue-800 border-blue-200", icon: CalendarDays },
  2: { label: "Concluído", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
  3: { label: "Cancelado", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
  4: { label: "Faltou", color: "bg-gray-100 text-gray-800 border-gray-200", icon: AlertCircle },
}

const MONTH_NAMES: Record<string, string> = {
  Jan: "Jan",
  Feb: "Fev",
  Mar: "Mar",
  Apr: "Abr",
  May: "Mai",
  Jun: "Jun",
  Jul: "Jul",
  Aug: "Ago",
  Sep: "Set",
  Oct: "Out",
  Nov: "Nov",
  Dec: "Dez",
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

export default function DashboardPage() {
  const { data, isLoading } = useSWR(API_CONFIG.ENDPOINTS.DASHBOARD, fetcher)
  const { data: aptData, mutate: mutateApts } = useSWR(API_CONFIG.ENDPOINTS.APPOINTMENTS, fetcher)

  const [timeFilter, setTimeFilter] = useState("today")
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground text-balance">Painel</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visao geral do seu negocio
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border/60">
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-24 mb-2 bg-muted" />
                <Skeleton className="h-8 w-32 bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-border/60">
            <CardContent className="pt-6">
              <Skeleton className="h-[300px] w-full bg-muted" />
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="pt-6">
              <Skeleton className="h-[300px] w-full bg-muted" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const chartData = (data?.revenueByMonth || []).map(
    (item: { monthLabel: string; total: number; count: number }) => ({
      month: MONTH_NAMES[item.monthLabel] || item.monthLabel,
      receita: Number(item.total),
      atendimentos: Number(item.count),
    })
  )

  const appointments = aptData ?? []
  const now = new Date()

  const filteredApts = appointments.filter((apt: any) => {
    const aptDate = new Date(apt.scheduledDateTime)
    if (timeFilter === "today") {
      return isToday(aptDate)
    } else {
      // This week (next 7 days)
      return isWithinInterval(aptDate, {
        start: startOfDay(now),
        end: endOfDay(addDays(now, 7))
      })
    }
  }).sort((a: any, b: any) => new Date(a.scheduledDateTime).getTime() - new Date(b.scheduledDateTime).getTime())

  async function handleStatusUpdate(id: string, newStatus: string) {
    setUpdatingId(id)
    try {
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.APPOINTMENTS}/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify(Number(newStatus))
      })
      if (res.hasError) {
        toast.error(res.message || "Erro ao atualizar status")
        return
      }
      toast.success("Status atualizado")
      mutateApts()
    } catch {
      toast.error("Erro ao atualizar status")
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <AuthGuard requiredRoles={["User"]}>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground text-balance">Painel</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Visao geral do seu negocio
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/appointments/new">
              <Plus className="mr-2 h-4 w-4" />
              Novo Agendamento
            </Link>
          </Button>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            title="Receita Mensal"
            value={formatCurrency(data?.monthlyRevenue || 0)}
            description="Faturamento do mes atual"
            icon={DollarSign}
          />
          <MetricCard
            title="Atendimentos"
            value={String(data?.monthlyServiceCount || 0)}
            description="Servicos neste mes"
            icon={CalendarDays}
          />
          <MetricCard
            title="Total de Clientes"
            value={String(data?.totalClients || 0)}
            description="Clientes cadastrados"
            icon={Users}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue chart */}
          <Card className="lg:col-span-2 border-border/60">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base font-semibold">
                  Receita dos Ultimos 6 Meses
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barSize={32}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="var(--color-border)"
                      />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 12 }}
                        stroke="var(--color-muted-foreground)"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        stroke="var(--color-muted-foreground)"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `R$${v}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--color-card)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "8px",
                          fontSize: "13px",
                        }}
                        formatter={(value: number) => [formatCurrency(value), "Receita"]}
                        labelStyle={{ fontWeight: 600 }}
                      />
                      <Bar
                        dataKey="receita"
                        fill="var(--color-primary)"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                  Nenhum dado de receita encontrado
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Appointments */}
          <Card className="border-border/60 overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base font-semibold">Agendamentos</CardTitle>
                <Tabs value={timeFilter} onValueChange={setTimeFilter} className="w-auto">
                  <TabsList className="h-8 p-0.5 bg-muted/50 border border-border/40">
                    <TabsTrigger value="today" className="text-[10px] px-2 h-7">Hoje</TabsTrigger>
                    <TabsTrigger value="week" className="text-[10px] px-2 h-7">Semana</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col divide-y divide-border/40">
                {filteredApts.length > 0 ? (
                  filteredApts.map((apt: any) => {
                    const config = statusConfig[apt.status] || statusConfig[0]
                    const date = new Date(apt.scheduledDateTime)
                    const isAptUpdating = updatingId === apt.id

                    return (
                      <div key={apt.id} className="p-4 hover:bg-accent/5 transition-colors group">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex flex-col gap-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-primary flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(date, "HH:mm")}
                              </span>
                              <Badge variant="outline" className={`text-[10px] px-1 h-4 ${config.color} border-none`}>
                                {config.label}
                              </Badge>
                            </div>
                            <h4 className="text-sm font-semibold text-foreground truncate">{apt.clientName}</h4>
                            <p className="text-xs text-muted-foreground truncate">
                              {apt.serviceName || apt.description || "Sem serviço definido"}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Select
                              key={apt.id}
                              value={String(apt.status)}
                              onValueChange={(v) => handleStatusUpdate(apt.id, v)}
                              disabled={isAptUpdating}
                            >
                              <SelectTrigger className="h-7 w-[100px] text-[10px] bg-transparent border-border/40">
                                {isAptUpdating ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : <SelectValue />}
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(statusConfig).map(([key, cfg]) => (
                                  <SelectItem key={key} value={key} className="text-[10px]">
                                    {cfg.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" asChild>
                              <Link href={`/appointments/${apt.id}`}>
                                <ChevronRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="p-8 text-center flex flex-col items-center gap-2">
                    <CalendarDays className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Nenhum agendamento para este período</p>
                  </div>
                )}
              </div>
              <div className="p-3 bg-muted/20 border-t border-border/40">
                <Button asChild size="sm" className="w-full">
                  <Link href="/appointments">
                    Ver todos os agendamentos
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top clients */}
        {data?.topClients && data.topClients.length > 0 && (
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Melhores Clientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {data.topClients.map(
                  (
                    client: {
                      name: string
                      serviceCount: number
                      totalSpent: number
                    },
                    i: number
                  ) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 border-b border-border/40 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {client.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {client.serviceCount} atendimentos
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        {formatCurrency(Number(client.totalSpent))}
                      </span>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthGuard>
  )
}
