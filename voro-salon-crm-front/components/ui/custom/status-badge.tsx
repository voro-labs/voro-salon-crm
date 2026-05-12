import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Circle, CalendarDays, CheckCircle2, XCircle, AlertCircle, ChevronDown, Check, LucideIcon } from "lucide-react"

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
  hideText?: boolean
  showChevron?: boolean
}

export function StatusDropdown({
  appointmentId,
  currentStatus,
  onStatusChange,
}: {
  appointmentId: string
  currentStatus: number
  onStatusChange: (id: string, newStatus: number) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => { e.stopPropagation(); e.preventDefault() }}>
        <button className="cursor-pointer">
          <StatusBadge status={currentStatus} showChevron />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {(Object.entries(appointmentStatusConfig) as [string, typeof appointmentStatusConfig[0]][]).map(([key, config]) => {
          const Icon = config.icon
          const isActive = currentStatus === Number(key)
          return (
            <DropdownMenuItem
              key={key}
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onStatusChange(appointmentId, Number(key)) }}
              className={isActive ? "font-semibold" : ""}
            >
              <Icon className="h-4 w-4 mr-2 shrink-0" />
              {config.label}
              {isActive && <Check className="ml-auto h-3 w-3" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function StatusBadge({ status, className = "", hideIcon = false, hideText = false, showChevron = false }: StatusBadgeProps) {
  const statusNum = Number(status) as AppointmentStatusId
  const config = appointmentStatusConfig[statusNum] || appointmentStatusConfig[0]
  const Icon = config.icon

  return (
    <Badge variant="outline" className={`text-xs h-6 w-fit border-none shrink-0 ${hideText ? "px-1.5" : "px-2.5"} ${config.color} ${showChevron ? "hover:brightness-95 cursor-pointer ring-1 ring-inset ring-black/10" : ""} ${className}`}>
      {!hideIcon && <Icon className={`h-3.5 w-3.5 ${!hideText ? "mr-1" : ""}`} />}
      {!hideText && config.label}
      {showChevron && <ChevronDown className="ml-0.5 h-3 w-3 opacity-50" />}
    </Badge>
  )
}
