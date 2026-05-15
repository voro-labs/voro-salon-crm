"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { BarChart3, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/custom/page-header"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import { formatCurrency } from "@/lib/format-utils"
import { ListSkeleton } from "@/components/ui/custom/list-skeleton"
import { cn } from "@/lib/utils"

const fetcher = async (url: string) => {
  const result = await secureApiCall<any>(url, { method: "GET" })
  if (result.hasError) throw new Error(result.message || "Error")
  return result.data
}

function buildMetricsUrl(selectedMonth: string | null) {
  if (!selectedMonth) return API_CONFIG.ENDPOINTS.DASHBOARD
  const [year, month] = selectedMonth.split("-")
  return `${API_CONFIG.ENDPOINTS.DASHBOARD}?month=${month}&year=${year}`
}

export default function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)

  const { data: metrics, isLoading } = useSWR(
    buildMetricsUrl(selectedMonth),
    fetcher
  )

  const monthlyRevenue = metrics?.monthlyRevenue ?? 0
  const monthlyServiceCount = metrics?.monthlyServiceCount ?? 0
  const totalClients = metrics?.totalClients ?? 0
  const revenueByMonth: any[] = metrics?.revenueByMonth ?? []
  const topClients: any[] = metrics?.topClients ?? []

  const maxRevenue = useMemo(() => {
    if (!revenueByMonth || revenueByMonth.length === 0) return 1
    return Math.max(...revenueByMonth.map((m: any) => m.total || 0))
  }, [revenueByMonth])

  const selectedMonthLabel = useMemo(() => {
    if (!selectedMonth) return null
    const date = parseISO(`${selectedMonth}-01`)
    return format(date, "MMMM 'de' yyyy", { locale: ptBR })
  }, [selectedMonth])

  const handleBarClick = (monthKey: string) => {
    setSelectedMonth((prev) => (prev === monthKey ? null : monthKey))
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Relatórios"
        description="Acompanhe o desempenho do seu estabelecimento"
      />

      {isLoading ? (
        <ListSkeleton type="cards" count={3} />
      ) : (
        <>
          {/* Gráfico de faturamento mensal */}
          {revenueByMonth.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4" />
                  Faturamento por mês
                  <span className="text-xs text-muted-foreground font-normal ml-1">
                    — clique em um mês para filtrar
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-1">
                  <div className="flex items-end gap-2 h-28">
                    {revenueByMonth.slice(-6).map((m: any) => {
                      const isSelected = selectedMonth === m.month
                      const hasSelection = selectedMonth !== null
                      return (
                        <button
                          key={m.month}
                          onClick={() => handleBarClick(m.month)}
                          className={cn(
                            "flex-1 rounded-t min-h-1 transition-all cursor-pointer focus:outline-none",
                            isSelected
                              ? "bg-primary ring-2 ring-primary ring-offset-1"
                              : hasSelection
                              ? "bg-primary/30 hover:bg-primary/50"
                              : "bg-primary hover:bg-primary/80"
                          )}
                          style={{
                            height: maxRevenue > 0
                              ? `${Math.round((m.total / maxRevenue) * 112)}px`
                              : "4px",
                          }}
                          title={formatCurrency(m.total)}
                        />
                      )
                    })}
                  </div>
                  <div className="flex gap-2">
                    {revenueByMonth.slice(-6).map((m: any) => {
                      const isSelected = selectedMonth === m.month
                      return (
                        <span
                          key={m.month}
                          className={cn(
                            "flex-1 text-[10px] text-center leading-tight transition-colors",
                            isSelected
                              ? "text-primary font-semibold"
                              : "text-muted-foreground"
                          )}
                        >
                          {m.monthLabel}
                        </span>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cabeçalho do período selecionado */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground capitalize">
              {selectedMonthLabel
                ? `Dados de ${selectedMonthLabel}`
                : "Dados do mês atual"}
            </p>
            {selectedMonth && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedMonth(null)}
              >
                <X className="h-3 w-3" />
                Voltar ao mês atual
              </Button>
            )}
          </div>

          {/* Métricas mensais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Faturamento
                </p>
                <p className="text-2xl font-bold mt-2">{formatCurrency(monthlyRevenue)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Serviços realizados
                </p>
                <p className="text-2xl font-bold mt-2">{monthlyServiceCount}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Total de clientes
                </p>
                <p className="text-2xl font-bold mt-2">{totalClients}</p>
              </CardContent>
            </Card>
          </div>

          {/* Top Clientes */}
          {topClients.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Clientes principais</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="py-2 font-medium">Cliente</th>
                        <th className="py-2 text-right font-medium">Serviços</th>
                        <th className="py-2 text-right font-medium">Total gasto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topClients.map((client: any, idx: number) => (
                        <tr key={`${client.name}-${idx}`} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="py-3 font-medium">{client.name}</td>
                          <td className="py-3 text-right text-muted-foreground">{client.serviceCount}</td>
                          <td className="py-3 text-right font-medium">
                            {formatCurrency(client.totalSpent)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
