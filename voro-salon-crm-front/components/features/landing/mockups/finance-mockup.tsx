"use client"

import { TrendingUp } from "lucide-react"

export function FinanceiroMockup() {
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"]
  const receitas = [3200, 3850, 3100, 4400, 3700, 4280]
  const despesas = [980, 1050, 920, 1200, 1080, 1150]
  const maxVal = Math.max(...receitas)
  const lucro = receitas[5] - despesas[5]
  const transactions = [
    { desc: "Coloração — Ana Lima", tipo: "entrada", valor: "R$180", hora: "09:00" },
    { desc: "Corte — Carla Souza", tipo: "entrada", valor: "R$85", hora: "10:30" },
    { desc: "Produto Keratin Pro", tipo: "saida", valor: "R$220", hora: "11:00" },
    { desc: "Hidratação — Julia M.", tipo: "entrada", valor: "R$120", hora: "13:00" },
  ]
  return (
    <div className="flex flex-col gap-2 p-4 h-full">
      <div className="grid grid-cols-3 gap-1.5">
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-2">
          <div className="text-[7px] text-muted-foreground mb-0.5">Receita</div>
          <div className="text-[11px] font-black text-green-600">R$4.280</div>
          <div className="text-[6px] text-green-600 flex items-center gap-0.5 mt-0.5">
            <TrendingUp className="h-1.5 w-1.5" /> +12%
          </div>
        </div>
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-2">
          <div className="text-[7px] text-muted-foreground mb-0.5">Despesas</div>
          <div className="text-[11px] font-black text-red-500">R$1.150</div>
          <div className="text-[6px] text-muted-foreground mt-0.5">fixo + variável</div>
        </div>
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-2">
          <div className="text-[7px] text-muted-foreground mb-0.5">Lucro</div>
          <div className="text-[11px] font-black text-primary">R${lucro.toLocaleString("pt-BR")}</div>
          <div className="text-[6px] text-primary mt-0.5 font-semibold">este mês</div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background p-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[8px] font-semibold text-foreground">Receita x Despesa — 6 meses</span>
        </div>
        <div className="flex items-end gap-1 h-12">
          {receitas.map((v, i) => (
            <div key={months[i]} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full flex flex-col items-center gap-px">
                <div className="w-full rounded-t-[2px] bg-primary/60" style={{ height: `${(v / maxVal) * 36}px` }} />
                <div className="w-full rounded-b-[1px] bg-red-400/50" style={{ height: `${(despesas[i] / maxVal) * 36}px` }} />
              </div>
              <span className={`text-[6px] ${i === 5 ? "text-primary font-bold" : "text-muted-foreground"}`}>{months[i]}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-1">
          <div className="flex items-center gap-0.5"><div className="h-1.5 w-2 rounded-sm bg-primary/60" /><span className="text-[6px] text-muted-foreground">Receita</span></div>
          <div className="flex items-center gap-0.5"><div className="h-1.5 w-2 rounded-sm bg-red-400/50" /><span className="text-[6px] text-muted-foreground">Despesa</span></div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background p-2 flex-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[8px] font-semibold text-foreground">Lançamentos de hoje</span>
          <span className="text-[7px] text-primary font-semibold">+ Novo</span>
        </div>
        <div className="flex flex-col gap-1">
          {transactions.map((t) => (
            <div key={t.desc} className="flex items-center gap-1.5 py-0.5 border-b border-border/40 last:border-0">
              <div className={`h-4 w-4 rounded-full shrink-0 flex items-center justify-center ${t.tipo === "entrada" ? "bg-green-500/15" : "bg-red-500/15"}`}>
                <span className={`text-[8px] font-black ${t.tipo === "entrada" ? "text-green-600" : "text-red-500"}`}>
                  {t.tipo === "entrada" ? "+" : "−"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[7px] font-medium text-foreground truncate">{t.desc}</div>
                <div className="text-[6px] text-muted-foreground">{t.hora}</div>
              </div>
              <span className={`text-[8px] font-bold shrink-0 ${t.tipo === "entrada" ? "text-green-600" : "text-red-500"}`}>{t.valor}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
