export interface KanbanAppointment {
  id: string
  clientName: string
  clientPhone?: string
  serviceName?: string
  scheduledDateTime: string
  durationMinutes: number
  status: number
  amount: number
  source: number // 1=WhatsAppBot 2=App 3=Website
  employeeName?: string
  funnelState?: string
  sessionId?: string
}
