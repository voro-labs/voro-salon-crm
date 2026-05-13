"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Loader2, User, ChevronLeft, ChevronRight, MessageSquare, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { WhatsAppConversation, WhatsAppMessage } from "./whatsapp.types"

interface ChatViewProps {
  conversations: WhatsAppConversation[]
  isLoading: boolean
  onRefresh: () => void
}

export function ChatView({ conversations, isLoading, onRefresh }: ChatViewProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<WhatsAppConversation | null>(null)
  const [search, setSearch] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: messages, isLoading: loadingMessages } = useSWR<WhatsAppMessage[]>(
    selected
      ? `${API_CONFIG.ENDPOINTS.WHATSAPP_MESSAGES}?phone=${encodeURIComponent(selected.phoneNumber)}`
      : null,
    async (url) => {
      const res = await secureApiCall<WhatsAppMessage[]>(url, { method: "GET" })
      return res.hasError ? [] : (res.data ?? [])
    },
    { refreshInterval: 5000 }
  )

  useEffect(() => {
    if (messages && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const filtered = conversations.filter((c) => {
    const q = search.toLowerCase()
    return (
      c.contactName.toLowerCase().includes(q) ||
      c.phoneNumber.includes(q)
    )
  })

  const displayName = (conv: WhatsAppConversation) =>
    conv.contactName !== "Cliente" ? conv.contactName : conv.phoneNumber

  const groupMessagesByDate = (msgs: WhatsAppMessage[]) => {
    const groups: { date: string; msgs: WhatsAppMessage[] }[] = []
    for (const msg of msgs) {
      const dateKey = format(new Date(msg.timestamp), "dd/MM/yyyy", { locale: ptBR })
      const last = groups[groups.length - 1]
      if (last && last.date === dateKey) {
        last.msgs.push(msg)
      } else {
        groups.push({ date: dateKey, msgs: [msg] })
      }
    }
    return groups
  }

  const handleDeleteConversation = async (conv: WhatsAppConversation) => {
    if (!confirm(`Excluir conversa com ${displayName(conv)}? O histórico será mantido no banco de dados.`)) return
    setDeletingId(conv.id)
    try {
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.WHATSAPP_CONVERSATIONS}/${conv.id}`, { method: "DELETE" })
      if (res.hasError) { toast.error(res.message || "Erro ao excluir."); return }
      toast.success("Conversa excluída.")
      if (selected?.id === conv.id) setSelected(null)
      onRefresh()
    } catch {
      toast.error("Erro de conexão.")
    } finally {
      setDeletingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando...
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden rounded-xl border border-border bg-card">
      {/* Sidebar – lista de conversas */}
      <div className={cn(
        "flex flex-col border-r border-border",
        "w-full md:w-72 md:shrink-0",
        selected ? "hidden md:flex" : "flex"
      )}>
        <div className="p-3 border-b border-border">
          <Input
            placeholder="Buscar conversa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center p-6">Nenhuma conversa.</p>
          ) : (
            filtered.map((conv) => {
              const isActive = selected?.id === conv.id
              return (
                <div
                  key={conv.id}
                  className={cn(
                    "group relative flex items-center gap-3 px-3 py-3 hover:bg-muted/50 transition-colors cursor-pointer",
                    isActive && "bg-primary/5 border-l-2 border-l-primary"
                  )}
                  onClick={() => setSelected(conv)}
                >
                  <div className={cn(
                    "shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold",
                    conv.state === "COMPLETED"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {displayName(conv).charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-semibold truncate">{displayName(conv)}</p>
                      <p className="text-[10px] text-muted-foreground shrink-0">
                        {format(new Date(conv.lastMessageAt), "HH:mm")}
                      </p>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{conv.lastMessageBody || "—"}</p>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv) }}
                    disabled={deletingId === conv.id}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-rose-100 hover:text-rose-600 text-muted-foreground"
                  >
                    {deletingId === conv.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />
                    }
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Painel de mensagens */}
      {selected ? (
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setSelected(null)}
                className="md:hidden flex items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0 -ml-1"
                aria-label="Voltar para conversas"
              >
                <ChevronLeft className="h-5 w-5" />
                <span className="text-xs font-medium">Voltar</span>
              </button>
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
                {displayName(selected).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{displayName(selected)}</p>
                <p className="text-[11px] text-muted-foreground font-mono">{selected.phoneNumber}</p>
              </div>
            </div>
            {selected.clientId && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 h-7 text-xs gap-1.5"
                onClick={() => router.push(`/clients/${selected.clientId}`)}
              >
                <User className="h-3 w-3" />
                <span className="hidden sm:inline">Ver cliente</span>
                <ChevronRight className="h-3 w-3 hidden sm:inline" />
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
            style={{ background: "hsl(var(--muted)/0.2)" }}>
            {loadingMessages ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !messages || messages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhuma mensagem salva para este contato.</p>
            ) : (
              groupMessagesByDate(messages).map((group) => (
                <div key={group.date} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] text-muted-foreground px-2">{group.date}</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  {group.msgs.map((msg) => {
                    const isOutbound = msg.direction === "outbound"
                    return (
                      <div
                        key={msg.id}
                        className={cn("flex", isOutbound ? "justify-end" : "justify-start")}
                      >
                        <div className={cn(
                          "max-w-[72%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                          isOutbound
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-card border border-border rounded-bl-sm"
                        )}>
                          <p className="leading-relaxed whitespace-pre-wrap wrap-break-word">{msg.body}</p>
                          <p className={cn(
                            "text-[10px] mt-1 text-right",
                            isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}>
                            {format(new Date(msg.timestamp), "HH:mm")}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center text-muted-foreground gap-3">
          <MessageSquare className="h-10 w-10 opacity-30" />
          <p className="text-sm">Selecione uma conversa para ver as mensagens</p>
        </div>
      )}
    </div>
  )
}
