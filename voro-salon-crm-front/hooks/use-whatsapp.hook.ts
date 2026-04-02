import { useState } from "react"
import { toast } from "sonner"

interface PendingWhatsApp {
  url: string
  clientName: string
  message: string
}

export function useWhatsApp() {
  const [pendingWhatsApp, setPendingWhatsApp] = useState<PendingWhatsApp | null>(null)

  function buildWhatsAppUrl(apt: any, newStatus: number): PendingWhatsApp | null {
    const supportedStatuses = [0, 1, 2, 3, 4, 5]
    if (!supportedStatuses.includes(newStatus)) return null

    if (!apt.clientPhone) {
      toast.warning("Cliente sem telefone cadastrado — não foi possível abrir o WhatsApp.")
      return null
    }

    const phone = apt.clientPhone.replace(/\D/g, "")
    const date = new Date(apt.scheduledDateTime || apt.date)
    const dateStr = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    const timeStr = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    const serviceName = apt.serviceName || apt.description || "serviço"
    const clientName = apt.clientName || apt.name || "Cliente"

    let message = ""
    switch (newStatus) {
      case 0:
        message = `Olá ${clientName}! Recebemos sua solicitação de agendamento para ${serviceName} em ${dateStr} às ${timeStr}. Estamos analisando e logo te confirmamos! ⏳`
        break
      case 1:
        message = `Olá ${clientName}! Seu agendamento de ${serviceName} foi confirmado para ${dateStr} às ${timeStr}. Aguardamos você! 😊`
        break
      case 2:
        message = `Olá ${clientName}! Obrigado pelo seu agendamento de ${serviceName}. Foi um prazer atendê-lo(a)! Qualquer dúvida, estamos à disposição. 🙏`
        break
      case 3:
        message = `Olá ${clientName}! Infelizmente seu agendamento de ${serviceName} para ${dateStr} às ${timeStr} precisou ser cancelado. Se desejar, podemos reagendar para outro horário! 😊`
        break
      case 4:
        message = `Olá ${clientName}, sentimos sua falta hoje no agendamento de ${serviceName}. Aconteceu algum imprevisto? Se quiser agendar uma nova data, estamos por aqui! 👋`
        break
      case 5:
        message = `Olá ${clientName}! Seu agendamento de ${serviceName} foi alterado para ${dateStr} às ${timeStr}. Caso tenha alguma dúvida, entre em contato! 😊`
        break
      default:
        return null
    }

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    return { url, clientName, message }
  }

  // Abre diretamente — para casos onde já existe confirmação própria (ex: AlertDialog no detalhe)
  const sendWhatsAppMessage = (apt: any, newStatus: number, tenantHasWhatsappBooking: boolean) => {
    if (tenantHasWhatsappBooking) return

    const pending = buildWhatsAppUrl(apt, newStatus)
    if (!pending) return

    window.open(pending.url, "_blank")
    toast.info("WhatsApp aberto com mensagem pré-preenchida.")
  }

  // Solicita confirmação antes de abrir — para uso no dashboard e similares
  const requestWhatsAppConfirm = (apt: any, newStatus: number, tenantHasWhatsappBooking: boolean) => {
    if (tenantHasWhatsappBooking) return

    const pending = buildWhatsAppUrl(apt, newStatus)
    if (!pending) return

    setPendingWhatsApp(pending)
  }

  const confirmWhatsApp = () => {
    if (pendingWhatsApp) {
      window.open(pendingWhatsApp.url, "_blank")
      toast.info("WhatsApp aberto com mensagem pré-preenchida.")
    }
    setPendingWhatsApp(null)
  }

  const cancelWhatsApp = () => setPendingWhatsApp(null)

  return {
    sendWhatsAppMessage,
    requestWhatsAppConfirm,
    pendingWhatsApp,
    confirmWhatsApp,
    cancelWhatsApp,
  }
}
