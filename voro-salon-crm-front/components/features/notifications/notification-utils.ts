import { Bell, Calendar, Wallet, Users, Info } from "lucide-react"

export function getNotificationIcon(type: string) {
  switch (type?.toLowerCase()) {
    case "appointment":
    case "appointment_created":
    case "new_appointment":
    case "status_changed_confirmed":
    case "status_changed_cancelled":
    case "status_changed_completed":
      return Calendar
    case "payment":
    case "finance":
      return Wallet
    case "client":
      return Users
    case "system":
      return Info
    default:
      return Bell
  }
}

export function getRelativeTime(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diffMs = now - date
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return "agora"
  if (diffMin < 60) return `há ${diffMin} min`
  if (diffHour < 24) return `há ${diffHour}h`
  if (diffDay === 1) return "ontem"
  if (diffDay < 7) return `há ${diffDay} dias`
  return new Date(dateStr).toLocaleDateString("pt-BR")
}
