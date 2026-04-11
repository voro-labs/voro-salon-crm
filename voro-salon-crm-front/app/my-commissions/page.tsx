"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { format, startOfMonth, endOfMonth } from "date-fns"
import { ptBR } from "date-fns/locale"
import { DollarSign, TrendingUp, Clock, CheckCircle } from "lucide-react"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/ui/custom/page-header"
import { ListSkeleton } from "@/components/ui/custom/list-skeleton"
import { EmptyState } from "@/components/ui/custom/empty-state"

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: format(new Date(2024, i, 1), "MMMM", { locale: ptBR }),
}))

const YEARS = Array.from({ length: 3 }, (_, i) => {
  const y = new Date().getFullYear() - i
  return { value: String(y), label: String(y) }
})

export default function MyCommissionsPage() {
  const now = new Date()
  const [month, setMonth] = useState(String(now.getMonth() + 1))
  const [year, setYear] = useState(String(now.getFullYear()))

  const { data: employeeData, isLoading: loadingEmployee } = useSWR(
    API_CONFIG.ENDPOINTS.EMPLOYEE_ME,
    async (url) => {
      const res = await secureApiCall<any>(url, { method: "GET" })
      if (res.hasError) throw new Error(res.message ?? "Failed to fetch employee data")
      return res.data
    }
  )

  const from = useMemo(() => {
    return startOfMonth(new Date(Number(year), Number(month) - 1, 1)).toISOString()
  }, [month, year])

  const to = useMemo(() => {
    return endOfMonth(new Date(Number(year), Number(month) - 1, 1)).toISOString()
  }, [month, year])

  const commissionsKey = employeeData?.id
    ? `${API_CONFIG.ENDPOINTS.EMPLOYEES}/${employeeData.id}/commissions?from=${from}&to=${to}`
    : null

  const { data: commissions, isLoading: loadingCommissions } = useSWR(
    commissionsKey,
    async (url) => {
      const res = await secureApiCall<any[]>(url, { method: "GET" })
      if (res.hasError) throw new Error(res.message ?? "Failed to fetch commissions")
      return res.data ?? []
    }
  )

  const totalPending = useMemo(
    () => (commissions ?? []).filter((c: any) => c.status === 0).reduce((sum: number, c: any) => sum + c.amount, 0),
    [commissions]
  )
  const totalPaid = useMemo(
    () => (commissions ?? []).filter((c: any) => c.status === 1).reduce((sum: number, c: any) => sum + c.amount, 0),
    [commissions]
  )
  const totalAll = useMemo(
    () => (commissions ?? []).reduce((sum: number, c: any) => sum + c.amount, 0),
    [commissions]
  )

  const isLoading = loadingEmployee || loadingCommissions

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Minhas Comissões"
        description="Acompanhe suas comissões por período"
      />

      {/* Filtros */}
      <div className="flex gap-3">
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label.charAt(0).toUpperCase() + m.label.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y.value} value={y.value}>
                {y.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total do Período</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {totalAll.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendente</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {totalPending.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pago</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {totalPaid.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhamento</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4">
              <ListSkeleton count={4} />
            </div>
          ) : !commissions || commissions.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={DollarSign}
                title="Nenhuma comissão no período"
                description="Suas comissões aparecerão aqui quando agendamentos forem finalizados."
              />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {commissions.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.description}</p>
                    {c.dueDate && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Vencimento: {format(new Date(c.dueDate), "dd/MM/yyyy")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <Badge variant={c.status === 1 ? "default" : "secondary"}>
                      {c.status === 1 ? "Pago" : "Pendente"}
                    </Badge>
                    <span className="text-sm font-semibold">
                      {Number(c.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
