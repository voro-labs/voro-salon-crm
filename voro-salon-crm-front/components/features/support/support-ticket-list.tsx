"use client"

import { Plus, Loader2, TicketX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface SupportTicketDto {
  id: string
  tenantId: string
  title: string
  category: string | number
  isUrgent: boolean
  status: string | number
  createdAt: string
  messageCount: number
  lastMessageBody?: string | null
}

interface SupportTicketListProps {
  tickets: SupportTicketDto[]
  selectedTicketId: string | null
  onSelect: (ticket: SupportTicketDto) => void
  onNewTicket: () => void
  isLoading: boolean
}

function getStatusConfig(status: string | number) {
  const s = String(status).toLowerCase()
  if (s === "0" || s === "open")
    return { label: "Aberto", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" }
  if (s === "1" || s === "inprogress")
    return { label: "Em andamento", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" }
  return { label: "Encerrado", className: "bg-muted text-muted-foreground" }
}

function getCategoryLabel(category: string | number) {
  const c = String(category).toLowerCase()
  if (c === "0" || c === "bug") return "Bug"
  if (c === "1" || c === "feature") return "Sugestão"
  return "Outro"
}

export function SupportTicketList({
  tickets,
  selectedTicketId,
  onSelect,
  onNewTicket,
  isLoading,
}: SupportTicketListProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b shrink-0">
        <Button size="sm" className="w-full" onClick={onNewTicket}>
          <Plus className="h-4 w-4 mr-2" />
          Novo ticket
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 gap-2 text-center">
            <TicketX className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhum ticket ainda</p>
          </div>
        ) : (
          tickets.map((ticket) => {
            const status = getStatusConfig(ticket.status)
            const isSelected = ticket.id === selectedTicketId
            return (
              <button
                key={ticket.id}
                type="button"
                onClick={() => onSelect(ticket)}
                className={cn(
                  "w-full text-left p-3 border-b transition-colors flex flex-col gap-1.5 border-l-2",
                  isSelected
                    ? "bg-muted border-l-primary"
                    : "border-l-transparent hover:bg-accent/40"
                )}
              >
                <p className="text-sm font-medium truncate">{ticket.title}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                      status.className
                    )}
                  >
                    {status.label}
                  </span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {getCategoryLabel(ticket.category)}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {new Date(ticket.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {ticket.lastMessageBody ?? "Nenhuma mensagem ainda"}
                </p>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
