"use client"

import {
  BarChart3, Bell, Calendar, CheckCircle2, ClipboardList, Wallet,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

interface ModuleInfo {
  name: string
  icon: React.ElementType
  description: string
  features: string[]
}

export const MODULE_INFO: Record<string, ModuleInfo> = {
  financial: {
    name: "Finanças",
    icon: Wallet,
    description: "Controle completo do fluxo de caixa do seu salão.",
    features: [
      "Lançamento de receitas e despesas",
      "Categorias personalizadas",
      "Resumo mensal com saldo previsto",
      "Histórico de pagamentos",
    ],
  },
  reports: {
    name: "Relatórios",
    icon: BarChart3,
    description: "Métricas e indicadores para tomar decisões com base em dados.",
    features: [
      "Receita por período",
      "Serviços mais realizados",
      "Clientes mais frequentes",
      "Exportação de dados",
    ],
  },
  anamnesis: {
    name: "Anamnese",
    icon: ClipboardList,
    description: "Ficha de avaliação capilar digital para cada cliente.",
    features: [
      "Perguntas personalizáveis",
      "Histórico de fichas por cliente",
      "Assinatura digital do cliente",
      "Evidências fotográficas",
    ],
  },
  booking: {
    name: "Agendamento Online",
    icon: Calendar,
    description: "Seus clientes agendam pelo celular, sem precisar ligar.",
    features: [
      "Link de agendamento personalizado",
      "Escolha de serviço, profissional e horário",
      "Confirmação automática via WhatsApp",
      "Disponível 24 horas por dia",
    ],
  },
  whatsappBot: {
    name: "Bot WhatsApp",
    icon: Bell,
    description: "Envio automático de mensagens de confirmação e lembretes.",
    features: [
      "Confirmação de agendamento",
      "Lembrete 24h antes",
      "Notificação de cancelamento",
      "Mensagens personalizadas com nome do salão",
    ],
  },
}

export function ModuleInfoDialog({
  moduleKey,
  onClose,
}: {
  moduleKey: string | null
  onClose: () => void
}) {
  const info = moduleKey ? MODULE_INFO[moduleKey] : null
  if (!info) return null
  const Icon = info.icon
  return (
    <Dialog open={!!moduleKey} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>{info.name}</DialogTitle>
          </div>
          <DialogDescription>{info.description}</DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2 mt-2">
          {info.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
