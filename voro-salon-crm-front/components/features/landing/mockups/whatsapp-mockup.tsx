"use client"

import { Scissors, MessageCircle, CheckCircle2 } from "lucide-react"

export function WhatsAppMockup() {
  return (
    <div className="flex flex-col gap-2 p-3 h-full">
      {/* WhatsApp header */}
      <div className="flex items-center gap-2 rounded-xl bg-green-600 px-3 py-2">
        <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <Scissors className="h-3.5 w-3.5 text-white" />
        </div>
        <div>
          <div className="text-[9px] font-bold text-white">Salão da Ana</div>
          <div className="text-[7px] text-green-100">Lembrete automático</div>
        </div>
        <div className="ml-auto h-4 w-4 rounded-full bg-white/10 flex items-center justify-center">
          <MessageCircle className="h-2.5 w-2.5 text-white" />
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex flex-col gap-2 flex-1 overflow-hidden">
        {/* Bot message — confirmação */}
        <div className="flex gap-1.5 max-w-[88%]">
          <div className="rounded-xl rounded-tl-none bg-muted/80 p-2 shadow-sm">
            <div className="text-[7.5px] text-foreground leading-relaxed">
              Olá, Camila! 👋 Confirmação de horário:<br />
              📅 Terça, 24 jun · 14h00<br />
              💇 Coloração + Hidratação<br />
              💰 R$ 300,00<br /><br />
              Você confirma presença?
            </div>
            <div className="text-[6px] text-muted-foreground text-right mt-0.5">13:47 ✓✓</div>
          </div>
        </div>

        {/* Client reply */}
        <div className="flex justify-end">
          <div className="rounded-xl rounded-tr-none bg-green-500 p-2 shadow-sm">
            <div className="text-[9px] text-white font-semibold">Confirmo! ✅</div>
            <div className="text-[6px] text-green-100 text-right mt-0.5">13:52 ✓✓</div>
          </div>
        </div>

        {/* Bot follow-up */}
        <div className="flex gap-1.5 max-w-[80%]">
          <div className="rounded-xl rounded-tl-none bg-muted/80 p-2 shadow-sm">
            <div className="text-[7.5px] text-foreground">
              Perfeito! Te esperamos 🙌<br />Até logo, Camila!
            </div>
            <div className="text-[6px] text-muted-foreground text-right mt-0.5">13:52 ✓✓</div>
          </div>
        </div>

        {/* Lembrete 24h */}
        <div className="mt-auto">
          <div className="text-center text-[6px] text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5 mx-auto w-fit mb-1.5">
            Lembrete automático — 24h antes
          </div>
          <div className="flex gap-1.5 max-w-[88%]">
            <div className="rounded-xl rounded-tl-none bg-muted/80 p-2 shadow-sm">
              <div className="text-[7.5px] text-foreground">
                ⏰ Lembrete: seu horário é amanhã às 14h no Salão da Ana!
              </div>
              <div className="text-[6px] text-muted-foreground text-right mt-0.5">14:00 ✓✓</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats badge */}
      <div className="flex items-center gap-1.5 rounded-xl bg-green-500/10 border border-green-500/20 px-2.5 py-1.5">
        <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
        <span className="text-[7.5px] text-green-700 dark:text-green-400 font-semibold">
          100% automático · você não faz nada
        </span>
      </div>
    </div>
  )
}
