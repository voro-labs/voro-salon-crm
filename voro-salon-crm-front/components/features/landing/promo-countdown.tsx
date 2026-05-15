"use client"

import React from "react"
import type { SubscriptionPlanDto } from "@/types/subscription.interface"

/**
 * Retorna o timestamp alvo da promo: fim do dia UTC da data informada.
 * Usa partes UTC para evitar o desvio de fuso (ex: UTC-3 anteciparia 1 dia).
 */
export function promoEndTarget(isoDate: string): number {
  const d = new Date(isoDate)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999)
}

export function isPlanPromoActive(plan: SubscriptionPlanDto): boolean {
  if (!plan.promoPrice) return false
  if (!plan.promoEndsAt) return true
  return promoEndTarget(plan.promoEndsAt) > Date.now()
}

export function formatPromoEndsAt(isoDate: string): string {
  const d = new Date(isoDate)
  // Usa partes UTC para exibir a data correta independente do fuso local
  const local = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  return local.toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  })
}

export function HeroPromoTimer({ endsAt }: { endsAt: string }) {
  const [label, setLabel] = React.useState("")

  React.useEffect(() => {
    const target = promoEndTarget(endsAt)
    const tick = () => {
      const diff = target - Date.now()
      if (diff <= 0) { setLabel(""); return }
      const days    = Math.floor(diff / 86_400_000)
      const hours   = Math.floor((diff % 86_400_000) / 3_600_000)
      const minutes = Math.floor((diff % 3_600_000)  / 60_000)
      const seconds = Math.floor((diff % 60_000)     / 1_000)
      const pad = (n: number) => String(n).padStart(2, "0")
      setLabel(days > 0
        ? `${days}d ${pad(hours)}h ${pad(minutes)}m`
        : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endsAt])

  if (!label) return null
  return (
    <span className="font-black tabular-nums">
      termina em {label}
    </span>
  )
}

export function PromoCountdown({ endsAt }: { endsAt: string | null }) {
  const [timeLeft, setTimeLeft] = React.useState<{
    days: number; hours: number; minutes: number; seconds: number
  } | null>(null)

  React.useEffect(() => {
    if (!endsAt) return
    const target = promoEndTarget(endsAt)
    const tick = () => {
      const diff = target - Date.now()
      if (diff <= 0) { setTimeLeft(null); return }
      setTimeLeft({
        days:    Math.floor(diff / 86_400_000),
        hours:   Math.floor((diff % 86_400_000) / 3_600_000),
        minutes: Math.floor((diff % 3_600_000)  / 60_000),
        seconds: Math.floor((diff % 60_000)     / 1_000),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endsAt])

  // Sem data → urgência genérica
  if (!endsAt) {
    return (
      <div className="flex items-center justify-center gap-2.5 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900/60 px-4 py-3 mb-6 text-sm">
        <span className="animate-pulse h-2 w-2 rounded-full bg-red-500 shrink-0" />
        <span className="font-semibold text-red-700 dark:text-red-400">
          Oferta por tempo limitado — preço promocional garantido enquanto durar
        </span>
      </div>
    )
  }

  if (!timeLeft) return null

  const pad = (n: number) => String(n).padStart(2, "0")

  const units = timeLeft.days > 0
    ? [
        { label: "dias",      value: timeLeft.days },
        { label: "horas",     value: timeLeft.hours },
        { label: "min",       value: timeLeft.minutes },
        { label: "seg",       value: timeLeft.seconds },
      ]
    : [
        { label: "horas",     value: timeLeft.hours },
        { label: "min",       value: timeLeft.minutes },
        { label: "seg",       value: timeLeft.seconds },
      ]

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900/60 px-5 py-3.5 mb-6">
      <div className="flex items-center gap-2">
        <span className="animate-pulse h-2 w-2 rounded-full bg-red-500 shrink-0" />
        <span className="text-sm font-bold text-red-700 dark:text-red-400">
          Oferta encerra em
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {units.map((u, i) => (
          <React.Fragment key={u.label}>
            {i > 0 && <span className="text-red-400 font-bold text-sm">:</span>}
            <div className="flex flex-col items-center min-w-10">
              <span className="bg-red-600 text-white text-base font-black tabular-nums rounded-md px-2 py-0.5 leading-tight">
                {pad(u.value)}
              </span>
              <span className="text-[9px] font-semibold text-red-500 mt-0.5 uppercase tracking-wide">
                {u.label}
              </span>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
