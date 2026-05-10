"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { format, subMonths, addMonths, startOfMonth } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronLeft, ChevronRight, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/custom/page-header"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import { ListSkeleton } from "@/components/ui/custom/list-skeleton"

const fetcher = async (url: string) => {
  const result = await secureApiCall<any>(url, { method: "GET" })
  if (result.hasError) throw new Error(result.message || "Error")
  return result.data
}

export default function ReportsPage() {
  const [currentDate, setCurrentDate] = useState(() => startOfMonth(new Date()))

  const { data: metrics, isLoading } = useSWR(
    `${API_CONFIG.ENDPOINTS.DASHBOARD || "/api/v1/dashboard/metrics"}`,
    fetcher
  )

  const monthlyRevenue = metrics?.monthlyRevenue ?? 0
  const monthlyServiceCount = metrics?.monthlyServiceCount ?? 0
  const totalClients = metrics?.totalClients ?? 0
  const revenueByMonth = metrics?.revenueByMonth ?? []
  const topClients = metrics?.topClients ?? []

  const maxRevenue = useMemo(() => {
    if (!revenueByMonth || revenueByMonth.length === 0) return 1
    return Math.max(...revenueByMonth.map((m: any) => m.total || 0))
  }, [revenueByMonth])

  const formatCurrency = (value: number) => {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
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

          {/* Gráfico de faturamento mensal */}
          {revenueByMonth && revenueByMonth.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4" />
                  Faturamento por mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Barras separadas dos labels para que height em px resolva corretamente */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-end gap-2 h-28">
                    {revenueByMonth.slice(-6).map((m: any) => (
                      <div
                        key={m.month}
                        className="bg-primary rounded-t flex-1 min-h-[4px] transition-all hover:bg-primary/80"
                        style={{
                          height: maxRevenue > 0
                            ? `${Math.round((m.total / maxRevenue) * 112)}px`
                            : "4px",
                        }}
                        title={formatCurrency(m.total)}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {revenueByMonth.slice(-6).map((m: any) => (
                      <span key={m.month} className="flex-1 text-[10px] text-muted-foreground text-center leading-tight">
                        {m.monthLabel}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Clientes */}
          {topClients && topClients.length > 0 && (
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
