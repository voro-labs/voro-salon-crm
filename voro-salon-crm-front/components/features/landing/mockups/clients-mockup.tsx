"use client"

import { Search, Star } from "lucide-react"

export function ClientesMockup() {
  const clients = [
    { name: "Ana Lima", visits: 14, spent: "R$1.240", stars: 5 },
    { name: "Carla Souza", visits: 8, spent: "R$720", stars: 5 },
    { name: "Julia Matos", visits: 22, spent: "R$2.100", stars: 4 },
    { name: "Beatriz Ramos", visits: 5, spent: "R$380", stars: 5 },
    { name: "Fernanda Costa", visits: 11, spent: "R$950", stars: 4 },
  ]
  return (
    <div className="flex flex-col gap-3 p-4 h-full">
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-lg border border-border bg-muted/40 flex items-center gap-1.5 px-2 py-1.5">
          <Search className="h-3 w-3 text-muted-foreground" />
          <div className="h-2 w-20 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="h-7 w-16 rounded-md bg-primary text-[8px] font-bold text-primary-foreground flex items-center justify-center">
          + Cliente
        </div>
      </div>
      <div className="flex flex-col gap-1.5 flex-1 overflow-hidden">
        {clients.map((c) => (
          <div
            key={c.name}
            className="flex items-center gap-2 rounded-xl border border-border bg-background p-2"
          >
            <div className="h-7 w-7 rounded-full bg-primary/20 shrink-0 flex items-center justify-center">
              <span className="text-[9px] font-black text-primary">{c.name[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[9px] font-semibold text-foreground">{c.name}</div>
              <div className="flex gap-0.5 mt-0.5">
                {Array.from({ length: c.stars }).map((_, i) => (
                  <Star key={i} className="h-2 w-2 fill-amber-400 text-amber-400" />
                ))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[8px] font-bold text-green-600">{c.spent}</div>
              <div className="text-[7px] text-muted-foreground">{c.visits} visitas</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
