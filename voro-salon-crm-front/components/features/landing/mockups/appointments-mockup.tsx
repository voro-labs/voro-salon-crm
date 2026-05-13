"use client"

export function AgendamentosMockup() {
  const hours = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00"]
  const colors = [
    "bg-primary/20 border-primary/40",
    "bg-blue-500/20 border-blue-500/40",
    "bg-green-500/20 border-green-500/40",
    "bg-amber-500/20 border-amber-500/40",
  ]
  return (
    <div className="flex flex-col gap-3 p-4 h-full">
      <div className="flex items-center justify-between">
        <div className="h-3 w-28 rounded-full bg-foreground/80" />
        <div className="flex gap-1.5">
          <div className="h-6 w-16 rounded-md bg-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center">
            + Novo
          </div>
        </div>
      </div>
      <div className="flex gap-1 overflow-hidden">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d, i) => (
          <div
            key={d}
            className={`flex-1 rounded-lg p-1 text-center ${i === 2 ? "bg-primary text-primary-foreground" : "bg-muted/50"}`}
          >
            <div
              className={`text-[7px] font-medium ${i === 2 ? "text-primary-foreground" : "text-muted-foreground"}`}
            >
              {d}
            </div>
            <div
              className={`text-[9px] font-black ${i === 2 ? "text-primary-foreground" : "text-foreground"}`}
            >
              {10 + i}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1 flex-1 overflow-hidden">
        {hours.map((h, i) => (
          <div key={h} className="flex gap-2 items-start">
            <span className="text-[8px] text-muted-foreground w-8 shrink-0 pt-0.5">{h}</span>
            {i % 3 !== 2 ? (
              <div className={`flex-1 rounded border px-1.5 py-1 ${colors[i % colors.length]}`}>
                <div className="text-[8px] font-semibold text-foreground">
                  {["Ana Lima", "Carla S.", "Julia M.", "Beatriz R.", "Fernanda C.", "Tatiana L."][i]}
                </div>
                <div className="text-[7px] text-muted-foreground">
                  {["Coloração", "Corte", "Hidratação", "Escova", "Manicure", "Design"][i]}
                </div>
              </div>
            ) : (
              <div className="flex-1 rounded border border-dashed border-border/50 px-1.5 py-1">
                <div className="text-[7px] text-muted-foreground/50">Disponível</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
