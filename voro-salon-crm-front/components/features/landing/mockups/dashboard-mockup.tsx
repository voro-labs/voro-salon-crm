"use client"

import { Scissors, Bell, TrendingUp, Clock } from "lucide-react"

export function DashboardMockup() {
  const weekBars = [42, 68, 55, 80, 91, 73, 60]
  const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"]
  const maxBar = Math.max(...weekBars)
  return (
    <div className="flex flex-col gap-2.5 p-4 h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
            <Scissors className="h-3 w-3 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <div className="h-2.5 w-20 rounded-full bg-foreground/80" />
            <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30 mt-0.5" />
          </div>
        </div>
        <div className="flex gap-1.5">
          <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center relative">
            <Bell className="h-3 w-3 text-muted-foreground" />
            <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500" />
          </div>
          <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-[7px] font-black text-primary">JS</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: "Hoje", value: "12", sub: "agendamentos", color: "bg-primary/10 text-primary", trend: "+2" },
          { label: "Receita", value: "R$840", sub: "este mês", color: "bg-green-500/10 text-green-600", trend: "+12%" },
          { label: "Clientes", value: "248", sub: "cadastrados", color: "bg-blue-500/10 text-blue-600", trend: "+8" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-background p-2 flex flex-col gap-0.5">
            <span className="text-[8px] text-muted-foreground font-medium">{c.label}</span>
            <span className={`text-[11px] font-black rounded px-1 w-fit ${c.color}`}>{c.value}</span>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-[7px] text-muted-foreground">{c.sub}</span>
              <span className="text-[7px] text-green-600 font-semibold">{c.trend}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-background p-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[8px] font-semibold text-foreground">Semana — atendimentos</span>
          <TrendingUp className="h-2.5 w-2.5 text-green-600" />
        </div>
        <div className="flex items-end gap-1 h-10">
          {weekBars.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className={`w-full rounded-t-[2px] ${i === 4 ? "bg-primary" : "bg-primary/30"}`}
                style={{ height: `${(v / maxBar) * 100}%` }}
              />
              <span className={`text-[6px] ${i === 4 ? "text-primary font-bold" : "text-muted-foreground"}`}>{weekDays[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background p-2 flex-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[8px] font-semibold text-foreground">Próximos agendamentos</span>
          <span className="text-[7px] text-primary font-semibold">Ver todos</span>
        </div>
        {[
          { name: "Ana Lima", service: "Coloração", time: "09:00", status: "confirmado" },
          { name: "Carla Souza", service: "Corte + Escova", time: "10:30", status: "pendente" },
          { name: "Julia Matos", service: "Hidratação", time: "13:00", status: "confirmado" },
        ].map((a) => (
          <div key={a.name} className="flex items-center gap-1.5 py-1 border-b border-border/40 last:border-0">
            <div className="h-5 w-5 rounded-full bg-primary/20 shrink-0 flex items-center justify-center">
              <span className="text-[7px] font-black text-primary">{a.name[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[8px] font-semibold text-foreground truncate">{a.name}</div>
              <div className="text-[7px] text-muted-foreground truncate">{a.service}</div>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-0.5">
                <Clock className="h-2 w-2 text-muted-foreground" />
                <span className="text-[7px] text-muted-foreground">{a.time}</span>
              </div>
              <span className={`text-[6px] font-semibold rounded px-1 ${a.status === "confirmado" ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600"}`}>
                {a.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
