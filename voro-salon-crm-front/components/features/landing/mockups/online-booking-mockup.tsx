"use client"

import { Scissors, Clock, CheckCircle2 } from "lucide-react"

export function AgendamentoOnlineMockup() {
  return (
    <div className="flex flex-col gap-2.5 p-4 h-full">
      {/* Salon header */}
      <div className="text-center">
        <div className="h-9 w-9 rounded-full bg-primary mx-auto mb-1 flex items-center justify-center">
          <Scissors className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="text-[11px] font-black text-foreground">Salão da Ana</div>
        <div className="text-[7px] text-muted-foreground">Agende seu horário online, 24h por dia</div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-1">
        {["Serviço", "Data", "Confirmar"].map((s, i) => (
          <div key={s} className="flex items-center gap-0.5">
            <div className={`h-4 w-4 rounded-full text-[7px] font-bold flex items-center justify-center ${i === 0 ? "bg-primary text-primary-foreground" : i === 1 ? "bg-primary/25 text-primary" : "bg-muted text-muted-foreground"}`}>
              {i + 1}
            </div>
            <span className={`text-[7px] ${i === 0 ? "text-primary font-semibold" : "text-muted-foreground"}`}>{s}</span>
            {i < 2 && <div className="w-3 h-px bg-border mx-0.5" />}
          </div>
        ))}
      </div>

      {/* Service selection */}
      <div className="flex flex-col gap-1.5 flex-1">
        <div className="text-[8px] font-semibold text-foreground">Escolha o serviço</div>
        {[
          { name: "Coloração completa", time: "120 min", price: "R$ 180", selected: true },
          { name: "Corte feminino", time: "45 min", price: "R$ 85", selected: false },
          { name: "Escova modeladora", time: "60 min", price: "R$ 70", selected: false },
          { name: "Hidratação profunda", time: "90 min", price: "R$ 120", selected: false },
        ].map((s) => (
          <div
            key={s.name}
            className={`flex items-center gap-2 rounded-lg border p-1.5 ${s.selected ? "border-primary bg-primary/5" : "border-border bg-background"}`}
          >
            <div className={`h-3 w-3 rounded-full border-2 shrink-0 ${s.selected ? "border-primary bg-primary" : "border-muted-foreground/30"}`} />
            <div className="flex-1 min-w-0">
              <div className={`text-[8px] font-medium truncate ${s.selected ? "text-foreground" : "text-muted-foreground"}`}>{s.name}</div>
              <div className="text-[6px] text-muted-foreground flex items-center gap-0.5">
                <Clock className="h-1.5 w-1.5" />{s.time}
              </div>
            </div>
            <div className={`text-[8px] font-bold shrink-0 ${s.selected ? "text-primary" : "text-muted-foreground"}`}>{s.price}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div>
        <div className="h-7 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-[9px] font-bold text-primary-foreground">Próximo — Escolher data →</span>
        </div>
        <div className="flex items-center justify-center gap-1 mt-1.5">
          <CheckCircle2 className="h-2.5 w-2.5 text-green-500" />
          <span className="text-[6.5px] text-muted-foreground">Sem login · sem download · 24h disponível</span>
        </div>
      </div>
    </div>
  )
}
