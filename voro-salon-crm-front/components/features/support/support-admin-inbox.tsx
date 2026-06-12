"use client"

import { useState } from "react"
import useSWR from "swr"
import { Inbox } from "lucide-react"
import { API_CONFIG } from "@/lib/api"
import { fetcher } from "@/lib/fetcher"
import { cn } from "@/lib/utils"
import { SupportTicketList, SupportTicketDto } from "./support-ticket-list"
import { SupportChatWindow } from "./support-chat-window"

type StatusFilter = "all" | "open" | "inprogress" | "closed"

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "open", label: "Abertos" },
  { value: "inprogress", label: "Em andamento" },
  { value: "closed", label: "Encerrados" },
]

function matchesStatus(status: string | number, filter: StatusFilter) {
  if (filter === "all") return true
  const s = String(status).toLowerCase()
  if (filter === "open") return s === "0" || s === "open"
  if (filter === "inprogress") return s === "1" || s === "inprogress"
  return s === "2" || s === "closed"
}

export function SupportAdminInbox() {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [filter, setFilter] = useState<StatusFilter>("all")

  const { data: tickets, isLoading, mutate } = useSWR<SupportTicketDto[]>(
    API_CONFIG.ENDPOINTS.ADMIN_SUPPORT_TICKETS,
    fetcher,
    { refreshInterval: 30000 }
  )

  const visibleTickets = (tickets ?? []).filter((t) => matchesStatus(t.status, filter))
  const selectedTicket = tickets?.find((t) => t.id === selectedTicketId) ?? null

  return (
    <div className="grid grid-cols-[320px_1fr] h-full border-t overflow-hidden">
      <div className="border-r overflow-hidden flex flex-col">
        <div className="flex gap-1 p-2 border-b shrink-0 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                "text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap transition-colors",
                filter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <SupportTicketList
          tickets={visibleTickets}
          selectedTicketId={selectedTicketId}
          onSelect={(ticket) => setSelectedTicketId(ticket.id)}
          onNewTicket={() => {}}
          isLoading={isLoading}
          showTenantName
          hideNewTicketButton
        />
      </div>
      <div className="overflow-hidden flex flex-col">
        {!selectedTicket ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center text-muted-foreground">
            <Inbox className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm">Selecione um ticket para responder.</p>
          </div>
        ) : (
          <SupportChatWindow
            ticketId={selectedTicket.id}
            ticketTitle={selectedTicket.title}
            perspective="support"
            ticketStatus={selectedTicket.status}
            onStatusChanged={() => mutate()}
          />
        )}
      </div>
    </div>
  )
}
