import { toast } from "sonner"
import { useAuth } from "@/contexts/auth.context"

export function useWhatsApp() {
  const { user } = useAuth()
  const tenant = user?.tenants?.[0] // Using the active tenant from auth context
  // Alternatively, we could fetch tenant from SWR if they use useWhatsApp independently

  const sendWhatsAppMessage = (apt: any, newStatus: number, tenantHasWhatsappBooking: boolean) => {
    const supportedStatuses = [0, 1, 2, 3, 4]
    if (!supportedStatuses.includes(newStatus)) return

    if (tenantHasWhatsappBooking) {
      return // The backend handles it
    }

    if (!apt.clientPhone) {
      toast.warning("Cliente sem telefone cadastrado — não foi possível abrir o WhatsApp.")
      return
    }

    const phone = apt.clientPhone.replace(/\D/g, "")
    const date = new Date(apt.scheduledDateTime || apt.date)
    const dateStr = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    const timeStr = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    const serviceName = apt.serviceName || apt.description || "serviço"
    const clientName = apt.clientName || apt.name || "Cliente"
    
    let message = ""
    switch (newStatus) {
      case 0: // Pending
        message = `Olá ${clientName}! Recebemos sua solicitação de agendamento para ${serviceName} em ${dateStr} às ${timeStr}. Estamos analisando e logo te confirmamos! ⏳`
        break
      case 1: // Confirmed
        message = `Olá ${clientName}! Seu agendamento de ${serviceName} foi confirmado para ${dateStr} às ${timeStr}. Aguardamos você! 😊`
        break
      case 2: // Completed
        message = `Olá ${clientName}! Obrigado pelo seu agendamento de ${serviceName}. Foi um prazer atendê-lo(a)! Qualquer dúvida, estamos à disposição. 🙏`
        break
      case 3: // Cancelled
        message = `Olá ${clientName}! Infelizmente seu agendamento de ${serviceName} para ${dateStr} às ${timeStr} precisou ser cancelado. Se desejar, podemos reagendar para outro horário! 😊`
        break
      case 4: // NoShow
        message = `Olá ${clientName}, sentimos sua falta hoje no agendamento de ${serviceName}. Aconteceu algum imprevisto? Se quiser agendar uma nova data, estamos por aqui! 👋`
        break
      default:
        return
    }
    
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    window.open(url, "_blank")
    toast.info("WhatsApp aberto com mensagem pré-preenchida.")
  }

  return { sendWhatsAppMessage }
}
