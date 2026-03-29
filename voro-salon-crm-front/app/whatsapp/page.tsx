"use client"

import { useState } from "react"
import useSWR from "swr"
import { MessageCircle, RefreshCw, Loader2, User, CalendarCheck, Send, X, CheckCircle, AlertCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import { fetcher } from "@/lib/fetcher"
import { AuthGuard } from "@/components/auth/auth.guard"
import { ModuleGuard } from "@/components/auth/module-guard"
import { PageHeader } from "@/components/ui/custom/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

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
}

const KANBAN_COLUMNS: { state: string; label: string; color: string; headerColor: string }[] = [
  { state: "START",                  label: "Novo Contato",            color: "border-slate-300",   headerColor: "bg-slate-100 text-slate-700" },
  { state: "AWAITING_SERVICE",       label: "Escolhendo Serviço",      color: "border-blue-300",    headerColor: "bg-blue-100 text-blue-700" },
  { state: "AWAITING_EMPLOYEE",      label: "Escolhendo Profissional", color: "border-violet-300",  headerColor: "bg-violet-100 text-violet-700" },
  { state: "AWAITING_DATE",          label: "Escolhendo Data",         color: "border-amber-300",   headerColor: "bg-amber-100 text-amber-700" },
  { state: "AWAITING_TIME",          label: "Escolhendo Horário",      color: "border-orange-300",  headerColor: "bg-orange-100 text-orange-700" },
  { state: "AWAITING_CONFIRMATION",  label: "Aguardando Confirmação",  color: "border-rose-300",    headerColor: "bg-rose-100 text-rose-700" },
  { state: "COMPLETED",              label: "Agendado",                color: "border-emerald-300", headerColor: "bg-emerald-100 text-emerald-700" },
]

function ConversationCard({ conv }: { conv: WhatsAppConversation }) {
  const isScheduled = conv.state === "COMPLETED" && conv.appointmentId

  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-3 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow",
        isScheduled ? "border-emerald-200 bg-emerald-50/40" : "border-border"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn(
            "shrink-0 rounded-full p-1.5",
            isScheduled ? "bg-emerald-100 text-emerald-600" : "bg-muted text-muted-foreground"
          )}>
            {isScheduled ? <CalendarCheck className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">
              {conv.contactName !== "Cliente" ? conv.contactName : conv.phoneNumber}
            </p>
            {conv.contactName !== "Cliente" && (
              <p className="text-[10px] text-muted-foreground font-mono truncate">{conv.phoneNumber}</p>
            )}
          </div>
        </div>
        {isScheduled && (
          <Badge variant="secondary" className="text-[10px] shrink-0 bg-emerald-100 text-emerald-700 border-emerald-200">
            Cliente
          </Badge>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
        {conv.lastMessageBody || "—"}
      </p>

      <p className="text-[10px] text-muted-foreground/70 text-right">
        {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true, locale: ptBR })}
      </p>
    </div>
  )
}

function SendTemplateModal({ onClose }: { onClose: () => void }) {
  const { data: templates } = useSWR<Template[]>(API_CONFIG.ENDPOINTS.WHATSAPP_TEMPLATES, fetcher)
  const { data: clients } = useSWR<any[]>(API_CONFIG.ENDPOINTS.CLIENTS, fetcher)

  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])
  const [bodyParams, setBodyParams] = useState<string[]>([])
  const [isSending, setIsSending] = useState(false)
  const [results, setResults] = useState<SendResult[] | null>(null)

  const currentTemplate = templates?.find((t) => t.name === selectedTemplate)

  const handleTemplateChange = (name: string) => {
    const tpl = templates?.find((t) => t.name === name)
    setSelectedTemplate(name)
    setBodyParams(Array(tpl?.paramsCount ?? 0).fill(""))
  }

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
      const res = await secureApiCall<SendResult[]>(API_CONFIG.ENDPOINTS.WHATSAPP_SEND_TEMPLATE, {
        method: "POST",
        body: JSON.stringify({
          clientIds: selectedClientIds,
          templateName: selectedTemplate,
          language: "pt_BR",
          bodyParams: bodyParams.filter(Boolean),
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
            {/* Template */}
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

            {/* Parâmetros do template */}
            {(currentTemplate?.paramsCount ?? 0) > 0 && (
              <div className="flex flex-col gap-2">
                <Label className="text-xs text-muted-foreground">Parâmetros do template</Label>
                {bodyParams.map((val, i) => {
                  const label = currentTemplate?.paramLabels?.[i] ?? `Parâmetro {{${i + 1}}}`
                  return (
                    <div key={i} className="flex flex-col gap-1">
                      <span className="text-[11px] text-muted-foreground">
                        <span className="font-mono text-primary">{"{{" + (i + 1) + "}}"}</span> — {label}
                      </span>
                      <Input
                        placeholder={label}
                        value={val}
                        onChange={(e) => setBodyParams((p) => p.map((v, j) => j === i ? e.target.value : v))}
                      />
                    </div>
                  )
                })}
              </div>
            )}

            {/* Seleção de clientes */}
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
                      <p className="text-xs text-muted-foreground truncate">{c.phone}</p>
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

export default function WhatsAppKanbanPage() {
  const [showSendModal, setShowSendModal] = useState(false)

  const { data: conversations, isLoading, mutate } = useSWR<WhatsAppConversation[]>(
    API_CONFIG.ENDPOINTS.WHATSAPP_CONVERSATIONS,
    fetcher,
    { refreshInterval: 30000 }
  )

  const getColumnConversations = (state: string) =>
    (conversations ?? []).filter((c) => c.state === state)

  return (
    <AuthGuard requiredRoles={["SalonOwner", "Owner"]}>
      <ModuleGuard moduleId={9}>
        <div className="flex flex-col gap-6 p-4 sm:p-6 h-full">
          <PageHeader
            title="WhatsApp — Kanban de Atendimentos"
            description="Acompanhe em qual etapa do agendamento cada contato está."
            action={
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowSendModal(true)}>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Template
                </Button>
                <Button variant="outline" size="sm" onClick={() => mutate()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Atualizar
                </Button>
              </div>
            }
          />

          {isLoading ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Carregando conversas...
            </div>
          ) : (conversations ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center border rounded-xl border-dashed">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <MessageCircle className="h-7 w-7 text-primary" />
              </div>
              <p className="font-semibold">Nenhuma conversa ainda</p>
              <p className="text-sm text-muted-foreground mt-1">
                As conversas via WhatsApp aparecerão aqui conforme os clientes interagirem.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-3 min-w-max">
                {KANBAN_COLUMNS.map((col) => {
                  const items = getColumnConversations(col.state)
                  return (
                    <div
                      key={col.state}
                      className={cn("flex flex-col gap-3 w-56 shrink-0 rounded-xl border-2 p-3", col.color)}
                    >
                      {/* Cabeçalho da coluna */}
                      <div className={cn("flex items-center justify-between rounded-lg px-2.5 py-1.5", col.headerColor)}>
                        <span className="text-xs font-semibold">{col.label}</span>
                        <span className="text-xs font-bold tabular-nums">{items.length}</span>
                      </div>

                      {/* Cards */}
                      <div className="flex flex-col gap-2 min-h-[60px]">
                        {items.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground text-center py-4">Nenhum contato</p>
                        ) : (
                          items.map((conv) => (
                            <ConversationCard key={conv.id} conv={conv} />
                          ))
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {showSendModal && <SendTemplateModal onClose={() => setShowSendModal(false)} />}
      </ModuleGuard>
    </AuthGuard>
  )
}
