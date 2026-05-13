"use client"

import { motion } from "framer-motion"
import { CheckCircle2, Sparkles, ArrowRight, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { SubscriptionPlanDto } from "@/types/subscription.interface"
import { isPlanPromoActive, formatPromoEndsAt } from "./promo-countdown"

export interface PlanCardProps {
  plan: SubscriptionPlanDto
  popular?: boolean
  showPromoDate?: boolean
  onSelect: (plan: SubscriptionPlanDto) => void
  onModuleInfo: (key: string) => void
  displayPrice?: number
}

export function PlanCard({ plan, popular, showPromoDate = true, onSelect, onModuleInfo, displayPrice }: PlanCardProps) {
  const resolvedPrice = displayPrice ?? (isPlanPromoActive(plan) ? plan.promoPrice! : plan.monthlyPrice)
  const promoActive = resolvedPrice < plan.monthlyPrice
  type FeatureItem = { label: string; moduleKey?: string; highlight?: boolean }

  const featureList: FeatureItem[] = [
    {
      label: plan.hasEmployees
        ? plan.maxEmployees === -1
          ? "Funcionários ilimitados"
          : `Até ${plan.maxEmployees} funcionários`
        : "Apenas o proprietário",
    },
    { label: plan.maxClients === -1 ? "Clientes ilimitados" : `Até ${plan.maxClients} clientes` },
    { label: "Agendamentos internos" },
    { label: "Gestão de clientes e serviços" },
    { label: "Notificações de agendamentos" },
    { label: "Mensagem WhatsApp manual" },
    ...(plan.hasFinancial ? [{ label: "Finanças", moduleKey: "financial" }] : []),
    ...(plan.hasReports ? [{ label: "Relatórios", moduleKey: "reports" }] : []),
    ...(plan.hasAnamnesis ? [{ label: "Anamnese", moduleKey: "anamnesis" }] : []),
    ...(plan.hasBooking ? [{ label: "Agendamento Online", moduleKey: "booking" }] : []),
    ...(plan.hasWhatsAppBot
      ? [{ label: "Bot WhatsApp", moduleKey: "whatsappBot", highlight: true }]
      : []),
    { label: "Exportar dados (CSV)" },
    { label: "Autenticação 2FA" },
    { label: "Suporte por e-mail" },
  ]

  return (
    <Card
      className={`relative flex flex-col transition-all duration-300 ${
        popular
          ? "border-primary shadow-2xl shadow-primary/15 scale-[1.02]"
          : "border-border hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
      }`}
    >
      {popular && (
        <motion.div
          className="absolute -top-3 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0, y: -8, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.3 }}
        >
          <Badge className="px-4 py-1 text-xs font-bold shadow-lg shadow-primary/30">
            <Sparkles className="h-3 w-3 mr-1" />
            Mais Popular
          </Badge>
        </motion.div>
      )}
      <CardHeader className="pb-4 pt-8">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{plan.name}</p>
        {promoActive && (
          <div className="flex items-center gap-1.5 mt-2">
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
              Oferta
            </span>
            {showPromoDate && plan.promoEndsAt && (
              <span className="text-xs text-red-500 font-semibold">
                até {formatPromoEndsAt(plan.promoEndsAt)}
              </span>
            )}
          </div>
        )}
        <div className="flex items-end gap-1 mt-2">
          <span className="text-4xl font-black text-foreground">
            {resolvedPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
          <span className="text-muted-foreground mb-1">/mês</span>
          {promoActive && (
            <span className="text-sm text-muted-foreground line-through mb-1">
              {plan.monthlyPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          )}
        </div>
        {!promoActive && isPlanPromoActive(plan) && (
          <p className="text-[10px] text-muted-foreground -mt-1">
            Promoção disponível apenas para novos clientes e upgrades
          </p>
        )}
        {popular && (
          <p className="text-xs text-muted-foreground -mt-1">
            ≈ R$ {(resolvedPrice / 30).toFixed(2)}/dia
          </p>
        )}
        <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
        {plan.defaultTrialDays > 0 && (
          <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            {plan.defaultTrialDays} dias grátis para testar
          </div>
        )}
      </CardHeader>
      <CardContent className="flex flex-col flex-1 gap-6">
        <ul className="flex flex-col gap-2.5 flex-1">
          {featureList.map((f) =>
            f.highlight ? (
              <li key={f.label} className="bg-primary/10 rounded-md px-2 py-1.5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                  <span className="flex-1">🤙 Lembrete automático via WhatsApp</span>
                  {f.moduleKey && (
                    <button
                      onClick={() => onModuleInfo(f.moduleKey!)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title={`Saiba mais sobre ${f.label}`}
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 ml-6">Reduz no-show em até 40%</p>
              </li>
            ) : (
              <li key={f.label} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                <span className="flex-1">{f.label}</span>
                {f.moduleKey && (
                  <button
                    onClick={() => onModuleInfo(f.moduleKey!)}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title={`Saiba mais sobre ${f.label}`}
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            )
          )}
        </ul>

        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          <Button
            className="w-full"
            variant={popular ? "default" : "outline"}
            onClick={() => onSelect(plan)}
          >
            Começar agora
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      </CardContent>
    </Card>
  )
}
