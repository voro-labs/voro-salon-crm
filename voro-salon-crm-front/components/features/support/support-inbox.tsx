"use client"

import { useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import { fetcher } from "@/lib/fetcher"
import { SupportTicketList, SupportTicketDto } from "./support-ticket-list"
import { SupportPrechat } from "./support-prechat"
import { SupportChatWindow } from "./support-chat-window"

export function SupportInbox() {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)

  const { data: tickets, isLoading, mutate } = useSWR<SupportTicketDto[]>(
    API_CONFIG.ENDPOINTS.SUPPORT_TICKETS,
    fetcher,
    { refreshInterval: 30000 }
  )

  const selectedTicketTitle = tickets?.find(t => t.id === selectedTicketId)?.title ?? ""

  const handleStart = async (category: string, isUrgent: boolean, title: string) => {
    try {
      const res = await secureApiCall<SupportTicketDto>(
        API_CONFIG.ENDPOINTS.SUPPORT_TICKETS,
        {
          method: "POST",
          body: JSON.stringify({ title, category, isUrgent }),
        }
      )

      if (res.hasError) {
        toast.error(res.message ?? "Erro ao abrir ticket.")
        return
      }

      mutate([...(tickets ?? []), res.data!], { revalidate: true })
      setSelectedTicketId(res.data!.id)
    } catch {
      toast.error("Erro de conexão.")
    }
  }

  const handleSelectTicket = (ticket: SupportTicketDto) => {
    setSelectedTicketId(ticket.id)
  }

  const handleNewTicket = () => {
    setSelectedTicketId(null)
  }

  return (
    <div className="grid grid-cols-[320px_1fr] h-full border-t overflow-hidden">
      <div className="border-r overflow-hidden flex flex-col">
        <SupportTicketList
          tickets={tickets ?? []}
          selectedTicketId={selectedTicketId}
          onSelect={handleSelectTicket}
          onNewTicket={handleNewTicket}
          isLoading={isLoading}
        />
      </div>
      <div className="overflow-hidden flex flex-col">
        {!selectedTicketId ? (
          <div className="overflow-y-auto flex-1">
            <SupportPrechat onStart={handleStart} />
          </div>
        ) : (
          <SupportChatWindow
            ticketId={selectedTicketId}
            ticketTitle={selectedTicketTitle}
          />
        )}
      </div>
    </div>
  )
}
