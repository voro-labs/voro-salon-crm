"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"

import { formatCurrency } from "@/lib/format-utils"

export interface RevenuePoint {
  month: string
  receita: number
  atendimentos: number
}

// Componente isolado só para manter o recharts fora do bundle inicial do dashboard:
// a página o carrega com next/dynamic, então a biblioteca só chega ao browser depois
// que o resto da tela já pintou.
export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  return (
    <ResponsiveContainer width="99%" height="100%">
      <BarChart data={data}>
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
  )
}
