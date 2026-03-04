"use client"

import useSWR from "swr"
import { MetricCard } from "@/components/metric-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DollarSign, CalendarDays, Users, TrendingUp } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"

import { API_CONFIG, secureApiCall } from "@/lib/api"
import { AuthGuard } from "@/components/auth/auth.guard"

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
  const { data, isLoading } = useSWR(API_CONFIG.ENDPOINTS.DASHBOARD, fetcher)

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
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="border-border/60">
          <CardContent className="pt-6">
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
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

  return (
    <AuthGuard requiredRoles={["Admin"]}>
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground text-balance">Painel</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visao geral do seu negocio
          </p>
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

        {/* Revenue chart */}
        <Card className="border-border/60">
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
