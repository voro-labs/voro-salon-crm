"use client"

import { Lock, Scissors, LogOut, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth.context"
import Link from "next/link"

interface SubscriptionPaywallProps {
  trialEndsAt: Date | null
  onRefresh: () => void
}

export function SubscriptionPaywall({ trialEndsAt, onRefresh }: SubscriptionPaywallProps) {
  const { logout } = useAuth()

  const formattedDate = trialEndsAt
    ? trialEndsAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : null

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="h-20 w-20 rounded-3xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <Lock className="h-10 w-10 text-destructive" />
        </div>

        <h1 className="text-3xl font-black tracking-tight mb-3">Trial encerrado</h1>

        {formattedDate && (
          <p className="text-muted-foreground text-sm mb-2">
            Seu período gratuito encerrou em <span className="font-semibold text-foreground">{formattedDate}</span>.
          </p>
        )}

        <p className="text-muted-foreground text-sm mb-8">
          Assine um plano para continuar usando o Voro Salon CRM e manter acesso a todos os seus dados.
        </p>

        <div className="flex flex-col gap-3">
          <Button asChild size="lg" className="w-full">
            <Link href="/subscription">Ver planos e assinar</Link>
          </Button>

          <Button variant="outline" className="w-full" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Já assinei — atualizar
          </Button>

          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={logout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair da conta
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2 mt-10 text-xs text-muted-foreground">
          <div className="h-5 w-5 rounded bg-primary flex items-center justify-center">
            <Scissors className="h-3 w-3 text-primary-foreground" />
          </div>
          Voro Salon CRM
        </div>
      </div>
    </div>
  )
}
