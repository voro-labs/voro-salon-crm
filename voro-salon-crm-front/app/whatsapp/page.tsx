"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import useSWR from "swr"
import {
  MessageCircle, RefreshCw, Loader2, User, Send, X,
  CheckCircle, AlertCircle, ExternalLink, ChevronRight, Settings2,
  MessageSquare, Trash2,
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import { fetcher } from "@/lib/fetcher"
import { formatPhone } from "@/lib/mask-utils"
import { AuthGuard } from "@/components/auth/auth.guard"
import { ModuleGuard } from "@/components/auth/module-guard"
import { PageHeader } from "@/components/ui/custom/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Template {
  name: string
  label: string
  paramsCount: number
  paramLabels?: string[]
}

interface SendResult {
  clientId: string
  clientName: string
  phone: string
  success: boolean
  error: string | null
}

interface WhatsAppConversation {
  id: string
  phoneNumber: string
  contactName: string
  state: string
  lastMessageBody: string
  lastMessageAt: string
  appointmentId: string | null
  clientId: string | null
}

interface WhatsAppMessage {
  id: string
  tenantId: string
  direction: "inbound" | "outbound"
  from: string
  to: string
  body: string
  whatsAppMessageId: string | null
  status: string
  timestamp: string
}

// ─── Chat view ───────────────────────────────────────────────────────────────

function ChatView({
  conversations,
  isLoading,
  onRefresh,
}: {
  conversations: WhatsAppConversation[]
  isLoading: boolean
  onRefresh: () => void
}) {
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
      <div className="w-72 shrink-0 flex flex-col border-r border-border">
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
                  {/* Avatar */}
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

                  {/* Botão excluir (aparece no hover) */}
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
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-3 min-w-0">
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
                Ver cliente
                <ChevronRight className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Mensagens */}
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
                  {/* Separador de data */}
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
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
          <MessageSquare className="h-10 w-10 opacity-30" />
          <p className="text-sm">Selecione uma conversa para ver as mensagens</p>
        </div>
      )}
    </div>
  )
}

// ─── Send template modal ─────────────────────────────────────────────────────

function SendTemplateModal({ onClose }: { onClose: () => void }) {
  const { data: templates } = useSWR<Template[]>(API_CONFIG.ENDPOINTS.WHATSAPP_TEMPLATES, fetcher)
  const { data: _clientsRaw } = useSWR(API_CONFIG.ENDPOINTS.CLIENTS + "?pageSize=500", fetcher)
  const clients = _clientsRaw?.items ?? (Array.isArray(_clientsRaw) ? _clientsRaw : undefined)
  const { data: tenant } = useSWR<any>(API_CONFIG.ENDPOINTS.TENANT_ME, fetcher)

  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])
  const [bodyParams, setBodyParams] = useState<string[]>([])
  const [isSending, setIsSending] = useState(false)
  const [results, setResults] = useState<SendResult[] | null>(null)

  const currentTemplate = templates?.find((t) => t.name === selectedTemplate)

  const isAutoParam = (label: string) => {
    const l = label.toLowerCase()
    return l.includes("estabelecimento") || l.includes("cliente")
  }

  const handleTemplateChange = (name: string) => {
    const tpl = templates?.find((t) => t.name === name)
    setSelectedTemplate(name)
    const labels = tpl?.paramLabels ?? []
    setBodyParams(Array(tpl?.paramsCount ?? 0).fill("").map((_, i) => {
      const label = labels[i] ?? ""
      if (label.toLowerCase().includes("estabelecimento")) return tenant?.name ?? ""
      return ""
    }))
  }

  useEffect(() => {
    if (!currentTemplate) return
    setBodyParams((prev) =>
      prev.map((val, i) => {
        const label = (currentTemplate.paramLabels?.[i] ?? "").toLowerCase()
        if (label.includes("estabelecimento")) return tenant?.name ?? val
        if (label.includes("cliente")) {
          if (selectedClientIds.length === 1) {
            return clients?.find((c: any) => c.id === selectedClientIds[0])?.name ?? val
          }
          return ""
        }
        return val
      })
    )
  }, [selectedClientIds, tenant])

  const toggleClient = (id: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleSend = async () => {
    if (!selectedTemplate) { toast.error("Selecione um template."); return }
    if (selectedClientIds.length === 0) { toast.error("Selecione pelo menos um cliente."); return }

    setIsSending(true)
    try {
      const finalParams = bodyParams.map((val, i) => {
        const label = (currentTemplate?.paramLabels?.[i] ?? "").toLowerCase()
        if (label.includes("cliente") && selectedClientIds.length > 1) return "__CLIENT_NAME__"
        return val
      })

      const res = await secureApiCall<SendResult[]>(API_CONFIG.ENDPOINTS.WHATSAPP_SEND_TEMPLATE, {
        method: "POST",
        body: JSON.stringify({
          clientIds: selectedClientIds,
          templateName: selectedTemplate,
          language: "pt_BR",
          bodyParams: finalParams,
        }),
      })
      if (res.hasError) { toast.error(res.message || "Erro ao enviar."); return }
      setResults(res.data ?? [])
      toast.success("Envio concluído!")
    } catch {
      toast.error("Erro de conexão.")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Enviar Mensagem Template
          </DialogTitle>
        </DialogHeader>

        {results ? (
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto py-1">
            {results.map((r) => (
              <div key={r.clientId} className={cn(
                "flex items-center justify-between gap-3 p-2.5 rounded-lg border text-sm",
                r.success ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"
              )}>
                <div className="flex items-center gap-2 min-w-0">
                  {r.success
                    ? <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                    : <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  }
                  <span className="truncate font-medium">{r.clientName}</span>
                </div>
                {!r.success && r.error && (
                  <span className="text-xs text-rose-600 shrink-0">{r.error}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-1">
            <div className="flex flex-col gap-1.5">
              <Label>Template *</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um template" />
                </SelectTrigger>
                <SelectContent>
                  {(templates ?? []).map((t) => (
                    <SelectItem key={t.name} value={t.name}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(currentTemplate?.paramsCount ?? 0) > 0 && (
              <div className="flex flex-col gap-2">
                <Label className="text-xs text-muted-foreground">Parâmetros do template</Label>
                {bodyParams.map((val, i) => {
                  const label = currentTemplate?.paramLabels?.[i] ?? `Parâmetro {{${i + 1}}}`
                  const auto = isAutoParam(label)
                  const isClientParam = label.toLowerCase().includes("cliente")
                  const multiClient = isClientParam && selectedClientIds.length > 1
                  return (
                    <div key={i} className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground">
                          <span className="font-mono text-primary">{"{{" + (i + 1) + "}}"}</span> — {label}
                        </span>
                        {auto && !multiClient && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">auto</span>
                        )}
                      </div>
                      {multiClient ? (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/40 text-xs text-muted-foreground">
                          Será substituído pelo nome de cada destinatário
                        </div>
                      ) : (
                        <Input
                          placeholder={label}
                          value={val}
                          readOnly={auto && !!val}
                          className={cn(auto && val && "bg-muted/40 text-muted-foreground cursor-default")}
                          onChange={(e) => {
                            if (auto && val) return
                            setBodyParams((p) => p.map((v, j) => j === i ? e.target.value : v))
                          }}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label>Clientes * <span className="text-muted-foreground font-normal">({selectedClientIds.length} selecionados)</span></Label>
              <div className="border rounded-lg max-h-44 overflow-y-auto divide-y">
                {(clients ?? []).filter((c: any) => c.phone).map((c: any) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleClient(c.id)}
                    className={cn(
                      "w-full flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left",
                      selectedClientIds.includes(c.id) && "bg-primary/5"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {formatPhone(c.phone)}
                      </p>
                    </div>
                    {selectedClientIds.includes(c.id) && (
                      <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                ))}
                {(clients ?? []).filter((c: any) => c.phone).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center p-4">Nenhum cliente com telefone.</p>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            {results ? "Fechar" : "Cancelar"}
          </Button>
          {!results && (
            <Button onClick={handleSend} disabled={isSending}>
              {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Enviar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WhatsAppPage() {
  const [showSendModal, setShowSendModal] = useState(false)
  const { data: tenant } = useSWR<any>(API_CONFIG.ENDPOINTS.TENANT_ME, fetcher)
  const { data: evolutionInstances } = useSWR<{ id: string; status: 0 | 1 | 2 }[]>(
    API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCES,
    fetcher
  )
  const evolutionConnected = (evolutionInstances ?? []).some((i) => i.status === 2)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [chatHeight, setChatHeight] = useState(0)

  // Calcula a altura disponível para o chat com base na posição real do container no DOM.
  // Depende de tenant e evolutionInstances pois o banner condicional altera o layout após o mount.
  useEffect(() => {
    const updateHeight = () => {
      if (chatContainerRef.current) {
        const top = chatContainerRef.current.getBoundingClientRect().top
        setChatHeight(window.innerHeight - top - 24)
      }
    }

    // Duplo RAF garante que o DOM terminou de fazer layout antes de medir
    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(updateHeight)
    })
    window.addEventListener("resize", updateHeight)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener("resize", updateHeight)
    }
  }, [tenant, evolutionInstances])

  const { data: conversations, isLoading, mutate } = useSWR<WhatsAppConversation[]>(
    API_CONFIG.ENDPOINTS.WHATSAPP_CONVERSATIONS,
    fetcher,
    { refreshInterval: 30000 }
  )

  return (
    <AuthGuard requiredRoles={["SalonOwner", "Owner"]}>
      <ModuleGuard moduleId={[9]}>
        {tenant !== undefined && !tenant?.useWhatsappBooking ? (
          <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center gap-6">
            <div className="h-20 w-20 rounded-full bg-rose-100 flex items-center justify-center">
              <MessageCircle className="h-10 w-10 text-rose-600" />
            </div>
            <div className="flex flex-col gap-2 max-w-sm">
              <h1 className="text-2xl font-bold text-foreground">Funcionalidade Desativada</h1>
              <p className="text-muted-foreground">
                O Agendamento pelo WhatsApp está atualmente desativado para o seu estabelecimento.
                Para utilizar o Bot e acompanhar os atendimentos, você precisa ativar esta opção nas configurações.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button asChild>
                <Link href="/settings?tab=whatsapp">
                  <Settings2 className="mr-2 h-4 w-4" />
                  Ir para Configurações
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-4 sm:p-6">
            <PageHeader
              title="WhatsApp — Mensagens"
              description="Gerencie as conversas com seus clientes."
              action={
                <div className="flex items-center gap-2">
                  {!evolutionConnected && (
                    <Button variant="outline" size="sm" onClick={() => setShowSendModal(true)}>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar Template
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => mutate()}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Atualizar
                  </Button>
                </div>
              }
            />

            {/* Banner: configuração incompleta do WhatsApp */}
            {tenant !== undefined && evolutionInstances !== undefined && !evolutionConnected && (!tenant?.whatsappPhoneNumberId || !tenant?.whatsappBusinessAccountId) && (
              <div className="border border-amber-400 bg-amber-50 dark:bg-amber-950/20 rounded-xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-1 min-w-0">
                    <p className="font-bold text-sm text-amber-900 dark:text-amber-200">
                      Integração WhatsApp não configurada
                    </p>
                    <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                      Os IDs do WhatsApp Business ainda não foram configurados para este estabelecimento. O bot não está ativo.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-400 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/30"
                    asChild
                  >
                    <a
                      href={`mailto:suporte@vorolabs.app?subject=Solicitar%20configuração%20WhatsApp&body=Olá%2C%20preciso%20configurar%20o%20WhatsApp%20Bot%20para%20o%20estabelecimento%3A%20${encodeURIComponent(tenant?.name ?? "")}%20(${encodeURIComponent(tenant?.id ?? "")})`}
                    >
                      Solicitar configuração
                    </a>
                  </Button>
                  <Button size="sm" variant="ghost" className="text-amber-700 dark:text-amber-300 text-xs" asChild>
                    <a href="/settings?tab=whatsapp">Configurar agora</a>
                  </Button>
                </div>
              </div>
            )}

            <div
              ref={chatContainerRef}
              className="overflow-hidden"
              style={chatHeight > 0 ? { height: chatHeight } : { height: "60vh" }}
            >
              <ChatView conversations={conversations ?? []} isLoading={isLoading} onRefresh={mutate} />
            </div>
          </div>
        )}

        {showSendModal && <SendTemplateModal onClose={() => setShowSendModal(false)} />}
      </ModuleGuard>
    </AuthGuard>
  )
}
