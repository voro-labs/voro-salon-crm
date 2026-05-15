export interface Template {
  name: string
  label: string
  paramsCount: number
  paramLabels?: string[]
}

export interface SendResult {
  clientId: string
  clientName: string
  phone: string
  success: boolean
  error: string | null
}

export interface WhatsAppConversation {
  id: string
  phoneNumber: string
  contactName: string
  state: string
  lastMessageBody: string
  lastMessageAt: string
  appointmentId: string | null
  clientId: string | null
}

export interface WhatsAppMessage {
  id: string
  tenantId: string
  direction: "inbound" | "outbound"
  from: string
  to: string
  body: string
  whatsAppMessageId: string | null
  status: string
  timestamp: string
}
