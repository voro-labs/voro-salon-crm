"use client"

import { useState, useEffect, useRef } from "react"
import useSWR from "swr"
import { Send, Loader2, Paperclip, X, MessageSquare, Clock } from "lucide-react"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import { fetcher } from "@/lib/fetcher"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface SupportMessage {
  id: string
  ticketId: string
  body: string
  attachmentUrl?: string | null
  isFromSupport: boolean
  createdAt: string
}

type Perspective = "salon" | "support"

// Only allow http(s) attachment links; reject javascript:/data: and other schemes
// to prevent XSS when a support agent opens an attacker-supplied URL.
function safeHttpUrl(raw?: string | null): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw)
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null
  } catch {
    return null
  }
}

interface SupportChatWindowProps {
  ticketId: string
  ticketTitle: string
  perspective?: Perspective
  ticketStatus?: string | number
  onStatusChanged?: () => void
}

export function SupportChatWindow({
  ticketId,
  ticketTitle,
  perspective = "salon",
  ticketStatus,
  onStatusChanged,
}: SupportChatWindowProps) {
  const [message, setMessage] = useState("")
  const [attachmentUrl, setAttachmentUrl] = useState("")
  const [showAttachment, setShowAttachment] = useState(false)
  const [sending, setSending] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const endpointBase =
    perspective === "support"
      ? API_CONFIG.ENDPOINTS.ADMIN_SUPPORT_TICKETS
      : API_CONFIG.ENDPOINTS.SUPPORT_TICKETS

  const { data: messages, mutate } = useSWR<SupportMessage[]>(
    `${endpointBase}/${ticketId}/messages`,
    fetcher,
    { refreshInterval: 10000 }
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // A message is "own" when authored from the current perspective.
  const isOwn = (msg: SupportMessage) =>
    perspective === "support" ? msg.isFromSupport : !msg.isFromSupport

  const handleSend = async () => {
    const body = message.trim()
    if (!body) return

    setSending(true)
    try {
      const res = await secureApiCall(`${endpointBase}/${ticketId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          ticketId,
          body,
          attachmentUrl: attachmentUrl.trim() || null,
        }),
      })

      if (res.hasError) {
        toast.error(res.message ?? "Erro ao enviar mensagem.")
        return
      }

      setMessage("")
      setAttachmentUrl("")
      setShowAttachment(false)
      mutate()
    } catch {
      toast.error("Erro de conexão.")
    } finally {
      setSending(false)
    }
  }

  const handleStatusChange = async (status: "Open" | "InProgress" | "Closed") => {
    setUpdatingStatus(true)
    try {
      const res = await secureApiCall(
        `${API_CONFIG.ENDPOINTS.ADMIN_SUPPORT_TICKETS}/${ticketId}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }
      )

      if (res.hasError) {
        toast.error(res.message ?? "Erro ao atualizar status.")
        return
      }

      onStatusChanged?.()
    } catch {
      toast.error("Erro de conexão.")
    } finally {
      setUpdatingStatus(false)
    }
  }

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

  const statusStr = String(ticketStatus ?? "").toLowerCase()
  const isClosed = statusStr === "2" || statusStr === "closed"
  const isInProgress = statusStr === "1" || statusStr === "inprogress"

  const subtitle =
    perspective === "support"
      ? "Respondendo como Suporte Voro"
      : "Suporte Voro • Responderemos em breve"

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b bg-card">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
          <MessageSquare className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{ticketTitle}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {perspective === "support" && (
          <div className="flex items-center gap-2 shrink-0">
            {!isClosed && !isInProgress && (
              <Button
                size="sm"
                variant="outline"
                disabled={updatingStatus}
                onClick={() => handleStatusChange("InProgress")}
              >
                Em andamento
              </Button>
            )}
            {!isClosed && (
              <Button
                size="sm"
                variant="outline"
                disabled={updatingStatus}
                onClick={() => handleStatusChange("Closed")}
              >
                Encerrar
              </Button>
            )}
            {isClosed && (
              <Button
                size="sm"
                variant="outline"
                disabled={updatingStatus}
                onClick={() => handleStatusChange("Open")}
              >
                Reabrir
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {!messages || messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center py-12">
            <Clock className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">Nenhuma mensagem ainda.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const own = isOwn(msg)
            const attachmentHref = safeHttpUrl(msg.attachmentUrl)
            return (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col gap-1 max-w-[80%]",
                  own ? "self-end items-end" : "self-start"
                )}
              >
                <div className={cn(
                  "px-3 py-2 rounded-2xl text-sm",
                  own
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted rounded-tl-sm"
                )}>
                  <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                  {attachmentHref && (
                    <a
                      href={attachmentHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "text-xs underline mt-1 block",
                        own ? "text-primary-foreground/80" : "text-primary"
                      )}
                    >
                      Anexo
                    </a>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground px-1">{formatTime(msg.createdAt)}</span>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t bg-card flex flex-col gap-2">
        {showAttachment && (
          <div className="flex items-center gap-2">
            <Input
              placeholder="URL do anexo (imagem ou link)"
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              className="text-sm"
            />
            <Button variant="ghost" size="icon" onClick={() => { setShowAttachment(false); setAttachmentUrl("") }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => setShowAttachment((v) => !v)}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            placeholder="Digite sua mensagem..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
            }}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className="shrink-0"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
