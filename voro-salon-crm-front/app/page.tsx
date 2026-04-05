"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import useSWR from "swr"
import Link from "next/link"
import { MetricCard } from "@/components/metric-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  DollarSign,
  CalendarDays,
  Users,
  TrendingUp,
  Plus,
  Clock,
  Loader2,
  ChevronRight,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { useWhatsApp } from "@/hooks/use-whatsapp.hook"
import { usePlanLimits } from "@/hooks/use-plan-limits.hook"
import { PageHeader } from "@/components/ui/custom/page-header"
import { StatusBadge, appointmentStatusConfig } from "@/components/ui/custom/status-badge"
import { ListSkeleton } from "@/components/ui/custom/list-skeleton"

const fetcher = async (url: string) => {
  const result = await secureApiCall<any>(url, { method: "GET" })
  if (result.hasError) throw new Error(result.message || "Error")
  return result.data
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
  const { data, isLoading, mutate: mutateDashboard } = useSWR(API_CONFIG.ENDPOINTS.DASHBOARD, fetcher)
  const { data: _aptRaw, mutate: mutateApts } = useSWR(API_CONFIG.ENDPOINTS.APPOINTMENTS + "?pageSize=500", fetcher)
  const aptData: any[] = _aptRaw?.items ?? (Array.isArray(_aptRaw) ? _aptRaw : [])

  const { data: tenant } = useSWR(API_CONFIG.ENDPOINTS.TENANT_ME, fetcher)
  const { data: modules } = useSWR(API_CONFIG.ENDPOINTS.TENANT_MODULES, fetcher)

  const [timeFilter, setTimeFilter] = useState("today")
  const [showPastModal, setShowPastModal] = useState(false)
  const hasShownPastModal = useRef(false)

  // Se não houver agendamentos hoje, mostra a semana automaticamente
  useEffect(() => {
    if (!aptData) return
    const hasToday = aptData.some((a: any) => isToday(new Date(a.scheduledDateTime)))
    if (!hasToday) setTimeFilter("week")
  }, [aptData])

  const pastAppointments = useMemo(() => {
    const now = new Date()
    return (aptData ?? []).filter((apt: any) => {
      const aptDate = new Date(apt.scheduledDateTime)
      return (
        aptDate < now &&
        (Number(apt.status) === 0 || Number(apt.status) === 1)
      )
    })
  }, [aptData])

  useEffect(() => {
    if (hasShownPastModal.current) return
    if (pastAppointments.length > 0) {
      setShowPastModal(true)
      hasShownPastModal.current = true
    }
  }, [pastAppointments])

  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { requestWhatsAppConfirm, pendingWhatsApp, confirmWhatsApp, cancelWhatsApp } = useWhatsApp()
  const { maxClients, hasBooking } = usePlanLimits()

  const isSchedulingEnabled = !modules || modules.find((m: any) => m.module === 2)?.isEnabled !== false

  const handleCopyLink = () => {
    if (!tenant?.slug) {
      toast.error("Erro ao obter link de agendamento")
      return
    }
    const url = `${window.location.origin}/booking/${tenant.slug}`
    navigator.clipboard.writeText(url)
    toast.success("Link de agendamento copiado para a área de transferência!")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleWhatsApp = (apt: any, newStatus: number) => {
    requestWhatsAppConfirm(apt, newStatus, !!tenant?.useWhatsappBooking)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <PageHeader title="Painel" description="Visao geral do seu negocio" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ListSkeleton count={3} type="cards" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-border/60 min-w-0">
            <CardContent className="pt-6">
              <Skeleton className="h-[300px] w-full bg-muted" />
            </CardContent>
          </Card>
          <Card className="border-border/60 min-w-0">
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

    // Filtro de tempo (hoje vs semana)
    let matchesTime = false
    if (timeFilter === "today") {
      matchesTime = isToday(aptDate)
    } else {
      // Esta semana (proximos 7 dias)
      matchesTime = isWithinInterval(aptDate, {
        start: startOfDay(now),
        end: endOfDay(addDays(now, 7))
      })
    }

    if (!matchesTime) return false

    // Filtro de status: Concluido (2), Cancelado (3), Faltou (4) saem da lista apos 20 min
    const isFinished = [2, 3, 4].includes(Number(apt.status))
    if (isFinished) {
      const minutesSinceApt = (now.getTime() - aptDate.getTime()) / (1000 * 60)
      if (minutesSinceApt > 20) return false
    }

    return true
  }).sort((a: any, b: any) => new Date(a.scheduledDateTime).getTime() - new Date(b.scheduledDateTime).getTime())
  .slice(0, 5)

  async function handleStatusUpdate(id: string, newStatus: string) {
    const apt = (aptData ?? []).find((a: any) => a.id === id)
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
      mutateDashboard()
      if (apt) handleWhatsApp(apt, Number(newStatus))
    } catch {
      toast.error("Erro ao atualizar status")
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <AuthGuard requiredRoles={["SalonOwner", "SalonEmployee", "Owner"]}>
      <div className="flex flex-col gap-6 p-6">
        <PageHeader 
          title="Painel" 
          description="Visao geral do seu negocio"
          action={
            isSchedulingEnabled ? (
              <>
                {hasBooking && (
                  <Button variant="outline" size="sm" onClick={handleCopyLink} disabled={!tenant?.slug}>
                    {copied ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <Copy className="mr-2 h-4 w-4" />}
                    {copied ? "Link Copiado!" : "Copiar Link de Agendamento"}
                  </Button>
                )}
                <Button asChild size="sm">
                  <Link href="/appointments/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Agendamento
                  </Link>
                </Button>
              </>
            ) : undefined
          }
        />

        {/* Metric cards */}
        <div className={`grid grid-cols-1 ${isSchedulingEnabled ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-4`}>
          <MetricCard
            title="Receita Mensal"
            value={formatCurrency(data?.monthlyRevenue || 0)}
            description="Faturamento do mes atual"
            icon={DollarSign}
          />
          {isSchedulingEnabled && (
            <MetricCard
              title="Atendimentos"
              value={String(data?.monthlyServiceCount || 0)}
              description="Servicos neste mes"
              icon={CalendarDays}
            />
          )}
          <MetricCard
            title="Total de Clientes"
            value={maxClients > 0 ? `${data?.totalClients || 0}/${maxClients}` : String(data?.totalClients || 0)}
            description="Clientes cadastrados"
            icon={Users}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue chart */}
          <Card className={`${isSchedulingEnabled ? "lg:col-span-2" : "lg:col-span-3"} border-border/60 min-w-0`}>
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
                <div className="h-[300px] w-full min-w-0">
                  <ResponsiveContainer width="99%" height="100%">
                    <BarChart data={chartData}>
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
                        tickFormatter={(v) => `R$${v >= 1000 ? (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'k' : v}`}
                        width={60}
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
                        maxBarSize={32}
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
          {isSchedulingEnabled && (
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
                      const date = new Date(apt.scheduledDateTime)
                      const isAptUpdating = updatingId === apt.id

                      return (
                        <div key={apt.id} className="p-4 hover:bg-accent/5 transition-colors group">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4 min-w-0 flex-1">
                              <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                                <span className="text-[10px] font-bold uppercase leading-none">
                                  {format(date, "MMM", { locale: ptBR })}
                                </span>
                                <span className="text-lg font-bold leading-tight">
                                  {format(date, "dd")}
                                </span>
                              </div>
                              <div className="flex flex-col gap-1 min-w-0 flex-1">
                                <div className="flex flex-col xs:flex-row xs:items-center gap-1.5">
                                  <span className="text-xs font-bold text-primary flex items-center gap-1 shrink-0">
                                    <Clock className="h-3 w-3" />
                                    {format(date, "HH:mm")}
                                  </span>
                                  <StatusBadge status={apt.status} />
                                </div>
                                <h4 className="text-sm font-semibold text-foreground truncate">{apt.clientName}</h4>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {apt.serviceName || apt.description || "Sem serviço definido"}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <Select
                                key={apt.id}
                                value={String(apt.status)}
                                onValueChange={(v) => handleStatusUpdate(apt.id, v)}
                                disabled={isAptUpdating}
                              >
                                <SelectTrigger className="h-7 w-[100px] text-[10px] bg-transparent border-border/40 shrink-0">
                                  {isAptUpdating ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : <SelectValue />}
                                </SelectTrigger>
                                <SelectContent className="min-w-[120px]">
                                  {Object.entries(appointmentStatusConfig).map(([key, cfg]) => (
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
          )}
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

      {/* ── WhatsApp Confirm Dialog ── */}
      <Dialog open={!!pendingWhatsApp} onOpenChange={(open) => !open && cancelWhatsApp()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-emerald-600" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              Enviar via WhatsApp?
            </DialogTitle>
            <p className="text-sm text-muted-foreground pt-1">
              Deseja enviar uma mensagem para <span className="font-semibold text-foreground">{pendingWhatsApp?.clientName}</span> sobre a atualização do agendamento?
            </p>
          </DialogHeader>
          {pendingWhatsApp?.message && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5 text-xs text-emerald-800 leading-relaxed">
              {pendingWhatsApp.message}
            </div>
          )}
          <DialogFooter className="flex-row gap-2 sm:flex-row">
            <Button variant="outline" className="flex-1" onClick={cancelWhatsApp}>
              Não
            </Button>
            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={confirmWhatsApp}>
              Enviar no WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPastModal} onOpenChange={setShowPastModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              Agendamentos sem atualização
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Os agendamentos abaixo já passaram e ainda estão como pendente ou confirmado.
            </p>
          </DialogHeader>

          <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto py-1 pr-1">
            {pastAppointments.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
                <p className="text-sm font-semibold text-foreground">Tudo certo!</p>
                <p className="text-xs text-muted-foreground">Nenhum agendamento pendente.</p>
              </div>
            ) : (
              pastAppointments.map((apt: any) => {
                const date = new Date(apt.scheduledDateTime)
                const isAptUpdating = updatingId === apt.id
                return (
                  <div key={apt.id} className="flex flex-col gap-2 rounded-xl border border-border/50 bg-amber-50/40 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-sm font-semibold text-foreground truncate">{apt.clientName}</span>
                        <span className="text-xs text-muted-foreground truncate">{apt.serviceName || "Sem serviço"}</span>
                        <span className="text-xs font-medium text-amber-700 flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />
                          {format(date, "HH:mm")}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        className="h-7 text-xs flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={isAptUpdating}
                        onClick={() => handleStatusUpdate(apt.id, "2")}
                      >
                        {isAptUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Concluído"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs flex-1 border-red-200 text-red-600 hover:bg-red-50"
                        disabled={isAptUpdating}
                        onClick={() => handleStatusUpdate(apt.id, "3")}
                      >
                        {isAptUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Cancelado"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs flex-1 border-orange-200 text-orange-600 hover:bg-orange-50"
                        disabled={isAptUpdating}
                        onClick={() => handleStatusUpdate(apt.id, "4")}
                      >
                        {isAptUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Faltou"}
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" className="w-full" onClick={() => setShowPastModal(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthGuard>
  )
}
