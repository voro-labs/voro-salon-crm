"use client"

import { Scissors, Clock } from "lucide-react"

export function ServicosMockup() {
  const services = [
    { name: "Coloração completa", duration: "120 min", price: "R$180", category: "Coloração", active: true },
    { name: "Corte feminino", duration: "45 min", price: "R$85", category: "Corte", active: true },
    { name: "Escova modeladora", duration: "60 min", price: "R$70", category: "Finalização", active: true },
    { name: "Hidratação profunda", duration: "90 min", price: "R$120", category: "Tratamento", active: true },
    { name: "Manicure + Pedicure", duration: "75 min", price: "R$65", category: "Unhas", active: false },
  ]
  const categories = ["Todos", "Corte", "Coloração", "Tratamento"]
  return (
    <div className="flex flex-col gap-2.5 p-4 h-full">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-foreground">Catálogo de Serviços</span>
          <span className="text-[7px] text-muted-foreground">5 serviços cadastrados</span>
        </div>
        <div className="h-6 w-16 rounded-md bg-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center">
          + Serviço
        </div>
      </div>

      <div className="flex gap-1 overflow-hidden">
        {categories.map((cat, i) => (
          <div
            key={cat}
            className={`rounded-full px-2 py-0.5 text-[7px] font-semibold whitespace-nowrap ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            {cat}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5 flex-1 overflow-hidden">
        {services.map((s) => (
          <div key={s.name} className={`flex items-center gap-2 rounded-xl border p-2 ${s.active ? "border-border bg-background" : "border-border/40 bg-muted/20"}`}>
            <div className="h-7 w-7 rounded-lg bg-primary/10 shrink-0 flex items-center justify-center">
              <Scissors className="h-3 w-3 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-[8px] font-semibold truncate ${s.active ? "text-foreground" : "text-muted-foreground"}`}>{s.name}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[6px] text-muted-foreground bg-muted rounded px-1 py-px">{s.category}</span>
                <span className="text-[6px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="h-1.5 w-1.5" />{s.duration}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[9px] font-black text-primary">{s.price}</div>
              <div className={`text-[6px] font-semibold mt-0.5 ${s.active ? "text-green-600" : "text-muted-foreground"}`}>
                {s.active ? "ativo" : "inativo"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
