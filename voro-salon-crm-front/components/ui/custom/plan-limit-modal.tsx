"use client"

import Link from "next/link"
import { TrendingUp, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PlanLimitModalProps {
  type: "clientes" | "funcionários"
  limit: number
  onClose: () => void
}

export function PlanLimitModal({ type, limit, onClose }: PlanLimitModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-xl shadow-2xl max-w-sm w-full p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <TrendingUp className="h-6 w-6" />
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground">Limite atingido</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Você atingiu o limite de{" "}
            <strong>
              {limit} {type}
            </strong>{" "}
            do seu plano atual. Faça upgrade para continuar adicionando.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Fechar
          </Button>
          <Button asChild className="flex-1">
            <Link href="/prices">Fazer upgrade</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
