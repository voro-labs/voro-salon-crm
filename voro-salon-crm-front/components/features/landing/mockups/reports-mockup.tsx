"use client"

import { TrendingUp, BarChart3 } from "lucide-react"

export function RelatoriosMockup() {
  const topServices = [
    { name: "Coloração", pct: 100, count: 38, receita: "R$6.840" },
    { name: "Corte feminino", pct: 72, count: 27, receita: "R$2.295" },
    { name: "Escova", pct: 55, count: 21, receita: "R$1.470" },
    { name: "Hidratação", pct: 40, count: 15, receita: "R$1.800" },
  ]
  return (
    <div className="flex flex-col gap-2.5 p-4 h-full">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-foreground">Relatórios</span>
          <span className="text-[7px] text-muted-foreground">Junho 2025</span>
        </div>
        <div className="flex gap-1">
          {["Mês", "Trim.", "Ano"].map((p, i) => (
            <div key={p} className={`rounded-full px-1.5 py-0.5 text-[7px] font-semibold ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{p}</div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-xl border border-border bg-background p-2">
          <div className="text-[7px] text-muted-foreground">Atendimentos</div>
          <div className="text-[13px] font-black text-foreground">101</div>
          <div className="text-[6px] text-green-600 flex items-center gap-0.5 font-semibold"><TrendingUp className="h-1.5 w-1.5" />+18% vs jun/24</div>
        </div>
        <div className="rounded-xl border border-border bg-background p-2">
          <div className="text-[7px] text-muted-foreground">Ticket médio</div>
          <div className="text-[13px] font-black text-foreground">R$128</div>
          <div className="text-[6px] text-green-600 flex items-center gap-0.5 font-semibold"><TrendingUp className="h-1.5 w-1.5" />+R$14 vs mai</div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background p-2 flex-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[8px] font-semibold text-foreground">Serviços mais realizados</span>
          <BarChart3 className="h-2.5 w-2.5 text-primary" />
        </div>
        <div className="flex flex-col gap-2">
          {topServices.map((s) => (
            <div key={s.name} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[7px] font-medium text-foreground">{s.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[6px] text-muted-foreground">{s.count}x</span>
                  <span className="text-[7px] font-bold text-green-600">{s.receita}</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary/60" style={{ width: `${s.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background p-2">
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-semibold text-foreground">Taxa de retorno</span>
          <span className="text-[8px] font-black text-primary">78%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
          <div className="h-full rounded-full bg-primary" style={{ width: "78%" }} />
        </div>
        <span className="text-[6px] text-muted-foreground mt-0.5 block">Clientes que retornaram em 60 dias</span>
      </div>
    </div>
  )
}
