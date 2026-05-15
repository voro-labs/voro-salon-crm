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

interface SupportChatWindowProps {
  ticketId: string
  ticketTitle: string
}

export function SupportChatWindow({ ticketId, ticketTitle }: SupportChatWindowProps) {
  const [message, setMessage] = useState("")
  const [attachmentUrl, setAttachmentUrl] = useState("")
  const [showAttachment, setShowAttachment] = useState(false)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: messages, mutate } = useSWR<SupportMessage[]>(
    `${API_CONFIG.ENDPOINTS.SUPPORT_TICKETS}/${ticketId}/messages`,
    fetcher,
    { refreshInterval: 10000 }
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    const body = message.trim()
    if (!body) return

    setSending(true)
    try {
      const res = await secureApiCall(
        `${API_CONFIG.ENDPOINTS.SUPPORT_TICKETS}/${ticketId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({
            ticketId,
            body,
            attachmentUrl: attachmentUrl.trim() || null,
          }),
        }
      )

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

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b bg-card">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
          <MessageSquare className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{ticketTitle}</p>
          <p className="text-xs text-muted-foreground">Suporte Voro • Responderemos em breve</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {!messages || messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center py-12">
            <Clock className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">Nenhuma mensagem ainda.</p>
            <p className="text-xs text-muted-foreground/70">Descreva seu problema abaixo.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex flex-col gap-1 max-w-[80%]",
                msg.isFromSupport ? "self-start" : "self-end items-end"
              )}
            >
              <div className={cn(
                "px-3 py-2 rounded-2xl text-sm",
                msg.isFromSupport
                  ? "bg-muted rounded-tl-sm"
                  : "bg-primary text-primary-foreground rounded-tr-sm"
              )}>
                <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                {msg.attachmentUrl && (
                  <a
                    href={msg.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "text-xs underline mt-1 block",
                      msg.isFromSupport ? "text-primary" : "text-primary-foreground/80"
                    )}
                  >
                    Anexo
                  </a>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground px-1">{formatTime(msg.createdAt)}</span>
            </div>
          ))
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
