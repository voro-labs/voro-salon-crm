"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Send, X, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import { fetcher } from "@/lib/fetcher"
import { formatPhone } from "@/lib/mask-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { Template, SendResult } from "./whatsapp.types"

interface SendTemplateModalProps {
  onClose: () => void
}

export function SendTemplateModal({ onClose }: SendTemplateModalProps) {
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
