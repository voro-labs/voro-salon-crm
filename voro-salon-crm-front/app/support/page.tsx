"use client"

import { useState } from "react"
import { AuthGuard } from "@/components/auth/auth.guard"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import { toast } from "sonner"
import { SupportPrechat } from "@/components/features/support/support-prechat"
import { SupportChatWindow } from "@/components/features/support/support-chat-window"

interface ActiveTicket {
  id: string
  title: string
}

export default function SupportPage() {
  const [activeTicket, setActiveTicket] = useState<ActiveTicket | null>(null)

  const handleStart = async (category: string, isUrgent: boolean, title: string) => {
    try {
      const res = await secureApiCall<{ id: string; title: string }>(
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

      setActiveTicket({ id: res.data!.id, title: res.data!.title })
    } catch {
      toast.error("Erro de conexão.")
    }
  }

  return (
    <AuthGuard requiredRoles={["SalonOwner", "SalonEmployee", "Owner"]}>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {!activeTicket ? (
          <SupportPrechat onStart={handleStart} />
        ) : (
          <SupportChatWindow ticketId={activeTicket.id} ticketTitle={activeTicket.title} />
        )}
      </div>
    </AuthGuard>
  )
}
