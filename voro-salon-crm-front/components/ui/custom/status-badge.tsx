import { Badge } from "@/components/ui/badge"
import { Circle, CalendarDays, CheckCircle2, XCircle, AlertCircle, LucideIcon } from "lucide-react"

export type AppointmentStatusId = 0 | 1 | 2 | 3 | 4

export const appointmentStatusConfig: Record<AppointmentStatusId, { label: string; color: string; icon: LucideIcon }> = {
  0: { label: "Pendente", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Circle },
  1: { label: "Confirmado", color: "bg-blue-100 text-blue-800 border-blue-200", icon: CalendarDays },
  2: { label: "Concluído", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
  3: { label: "Cancelado", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
  4: { label: "Faltou", color: "bg-gray-100 text-gray-800 border-gray-200", icon: AlertCircle },
}

interface StatusBadgeProps {
  status: number | string
  className?: string
  hideIcon?: boolean
}

export function StatusBadge({ status, className = "", hideIcon = false }: StatusBadgeProps) {
  const statusNum = Number(status) as AppointmentStatusId
  const config = appointmentStatusConfig[statusNum] || appointmentStatusConfig[0]
  const Icon = config.icon

  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 h-4 w-fit border-none shrink-0 ${config.color} ${className}`}>
      {!hideIcon && <Icon className="mr-1 h-3 w-3" />}
      {config.label}
    </Badge>
  )
}
