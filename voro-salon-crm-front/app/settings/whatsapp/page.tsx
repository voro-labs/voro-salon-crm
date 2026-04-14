"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Plus, Pencil, Trash2, MessageSquare, Loader2, X, CheckCircle, Wifi, WifiOff, AlertTriangle } from "lucide-react"
import { AuthGuard } from "@/components/auth/auth.guard"
import { PageHeader } from "@/components/ui/custom/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import { fetcher } from "@/lib/fetcher"
import { toast } from "sonner"
import { usePlanLimits } from "@/hooks/use-plan-limits.hook"

interface OnboardingStatus {
  connected: boolean
  displayPhone: string | null
  businessAccountId: string | null
  tokenExpiresAt: string | null
}

interface OnboardingConfig {
  appId: string
  configId: string
}

interface WhatsAppTemplate {
  id: string
  name: string
  label: string
  paramsCount: number
  paramLabels: string[] | null
  isActive: boolean
  tenantId: string
  createdAt: string
}

const EMPTY_FORM = {
  name: "",
  label: "",
  paramsCount: 0,
  paramLabels: [] as string[],
  isActive: true,
}

const fetchOnboardingStatus = async (url: string): Promise<OnboardingStatus | null> => {
  const res = await secureApiCall<OnboardingStatus>(url)
  if (res.hasError) return null
  return res.data ?? null
}

export default function WhatsAppTemplatesPage() {
  const router = useRouter()
  const { hasWhatsAppBot, isLoaded } = usePlanLimits()

  const { data: templates, isLoading, mutate } = useSWR<WhatsAppTemplate[]>(
    API_CONFIG.ENDPOINTS.WHATSAPP_TEMPLATES,
    fetcher
  )

  const { data: onboardingStatus, isLoading: statusLoading, mutate: mutateStatus } = useSWR<OnboardingStatus | null>(
    API_CONFIG.ENDPOINTS.WHATSAPP_ONBOARDING_STATUS,
    fetchOnboardingStatus,
    { fallbackData: null }
  )

  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<WhatsAppTemplate | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [paramLabelsText, setParamLabelsText] = useState("")
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const buildSignupUrl = (appId: string, configId: string) => {
    const extras = encodeURIComponent(JSON.stringify({ setup: {} }))
    return `https://business.facebook.com/messaging/whatsapp/onboard/?app_id=${appId}&config_id=${configId}&extras=${extras}`
  }

  const handleConnect = useCallback(async () => {
    setConnecting(true)
    try {
      const configRes = await secureApiCall<OnboardingConfig>(API_CONFIG.ENDPOINTS.WHATSAPP_ONBOARDING_CONFIG)
      if (configRes.hasError || !configRes.data) {
        toast.error("Erro ao obter configuração do WhatsApp.")
        return
      }

      const { appId, configId } = configRes.data
      const url = buildSignupUrl(appId, configId)

      const popup = window.open(url, "wa_signup", "width=800,height=700,scrollbars=yes")
      if (!popup) {
        toast.error("Popup bloqueado. Permita popups para este site e tente novamente.")
        return
      }

      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== "https://business.facebook.com") return
        try {
          const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data
          if (data?.type !== "WA_EMBEDDED_SIGNUP") return

          if (data.event === "FINISH") {
            const { code, waba_id } = data.data ?? {}
            if (code && waba_id) {
              popup.close()
              window.removeEventListener("message", handleMessage)
              setConnecting(true)
              const exchangeRes = await secureApiCall(API_CONFIG.ENDPOINTS.WHATSAPP_ONBOARDING_EXCHANGE, {
                method: "POST",
                body: JSON.stringify({ code, wabaId: waba_id }),
              })
              if (exchangeRes.hasError) {
                toast.error(exchangeRes.message ?? "Erro ao conectar WhatsApp.")
              } else {
                toast.success("WhatsApp Business conectado com sucesso!")
                mutateStatus()
              }
              setConnecting(false)
            }
          } else if (data.event === "CANCEL" || data.event === "ERROR") {
            popup.close()
            window.removeEventListener("message", handleMessage)
            toast.error("Conexão com WhatsApp cancelada.")
            setConnecting(false)
          }
        } catch {
          // ignore parse errors
        }
      }

      window.addEventListener("message", handleMessage)

      // Poll for popup close (user closed manually)
      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer)
          window.removeEventListener("message", handleMessage)
          setConnecting(false)
        }
      }, 500)
    } catch {
      toast.error("Erro de conexão.")
      setConnecting(false)
    }
  }, [mutateStatus])

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      const res = await secureApiCall(API_CONFIG.ENDPOINTS.WHATSAPP_ONBOARDING_DISCONNECT, { method: "DELETE" })
      if (res.hasError) {
        toast.error(res.message ?? "Erro ao desconectar.")
      } else {
        toast.success("WhatsApp desconectado.")
        mutateStatus()
      }
    } catch {
      toast.error("Erro de conexão.")
    } finally {
      setDisconnecting(false)
      setDisconnectDialogOpen(false)
    }
  }

  const formatExpiry = (dateStr: string | null) => {
    if (!dateStr) return null
    const d = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const formatted = d.toLocaleDateString("pt-BR")
    return { formatted, diffDays }
  }

  // Redirect if plan doesn't include WhatsApp bot (after plan is loaded)
  useEffect(() => {
    if (isLoaded && !hasWhatsAppBot) {
      router.replace("/settings")
    }
  }, [isLoaded, hasWhatsAppBot, router])

  if (isLoaded && !hasWhatsAppBot) return null

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setParamLabelsText("")
    setDialogOpen(true)
  }

  const openEdit = (t: WhatsAppTemplate) => {
    setEditing(t)
    setForm({
      name: t.name,
      label: t.label,
      paramsCount: t.paramsCount,
      paramLabels: t.paramLabels ?? [],
      isActive: t.isActive,
    })
    setParamLabelsText((t.paramLabels ?? []).join("\n"))
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.label.trim()) {
      toast.error("Nome técnico e rótulo são obrigatórios.")
      return
    }

    const paramLabels = paramLabelsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)

    const body = {
      name: form.name.trim(),
      label: form.label.trim(),
      paramsCount: form.paramsCount,
      paramLabels: paramLabels.length > 0 ? paramLabels : null,
      isActive: form.isActive,
    }

    setSaving(true)
    try {
      let res
      if (editing) {
        res = await secureApiCall(`${API_CONFIG.ENDPOINTS.WHATSAPP_TEMPLATES}/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        })
      } else {
        res = await secureApiCall(API_CONFIG.ENDPOINTS.WHATSAPP_TEMPLATES, {
          method: "POST",
          body: JSON.stringify(body),
        })
      }

      if (res.hasError) {
        toast.error(res.message ?? "Erro ao salvar template.")
        return
      }

      toast.success(editing ? "Template atualizado!" : "Template criado!")
      mutate()
      setDialogOpen(false)
    } catch {
      toast.error("Erro de conexão.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.WHATSAPP_TEMPLATES}/${id}`, {
        method: "DELETE",
      })
      if (res.hasError) {
        toast.error(res.message ?? "Erro ao excluir template.")
        return
      }
      toast.success("Template excluído.")
      mutate()
    } catch {
      toast.error("Erro de conexão.")
    } finally {
      setDeletingId(null)
    }
  }

  const filteredTemplates = (templates ?? []).filter(t => t.tenantId !== "00000000-0000-0000-0000-000000000000")

  const expiryInfo = formatExpiry(onboardingStatus?.tokenExpiresAt ?? null)

  return (
    <AuthGuard requiredRoles={["SalonOwner", "Owner"]}>
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <PageHeader
          title="WhatsApp Business"
          description="Conecte seu número e gerencie os templates de mensagem."
          action={
            <Button onClick={openCreate} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Novo Template
            </Button>
          }
        />

        {/* Connection Card */}
        <Card>
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${onboardingStatus?.connected ? "bg-emerald-100 dark:bg-emerald-950/30" : "bg-zinc-100 dark:bg-zinc-800"}`}>
              {statusLoading
                ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                : onboardingStatus?.connected
                  ? <Wifi className="h-6 w-6 text-emerald-600" />
                  : <WifiOff className="h-6 w-6 text-zinc-500" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground">Número WhatsApp Business</span>
                {!statusLoading && (
                  onboardingStatus?.connected
                    ? <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 gap-1 text-xs">
                        <CheckCircle className="h-3 w-3" />
                        Conectado
                      </Badge>
                    : <Badge variant="outline" className="text-zinc-500 border-zinc-300 text-xs">
                        Desconectado
                      </Badge>
                )}
              </div>

              {onboardingStatus?.connected ? (
                <div className="flex flex-col gap-0.5 mt-1">
                  {onboardingStatus.displayPhone && (
                    <p className="text-sm text-muted-foreground font-mono">{onboardingStatus.displayPhone}</p>
                  )}
                  {expiryInfo && (
                    <div className="flex items-center gap-1">
                      {expiryInfo.diffDays <= 7 && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                      <p className={`text-xs ${expiryInfo.diffDays <= 7 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                        Token expira em {expiryInfo.formatted} ({expiryInfo.diffDays} dia{expiryInfo.diffDays !== 1 ? "s" : ""})
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-0.5">
                  Conecte seu número para enviar mensagens aos clientes.
                </p>
              )}
            </div>

            <div className="shrink-0">
              {onboardingStatus?.connected ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDisconnectDialogOpen(true)}
                  disabled={disconnecting || statusLoading}
                >
                  {disconnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WifiOff className="mr-2 h-4 w-4" />}
                  Desconectar
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleConnect}
                  disabled={connecting || statusLoading}
                >
                  {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wifi className="mr-2 h-4 w-4" />}
                  {connecting ? "Aguardando..." : "Conectar WhatsApp Business"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Disconnect Confirmation Dialog */}
        <Dialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Desconectar WhatsApp?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Ao desconectar, os envios automáticos de mensagens serão interrompidos até que você reconecte um número.
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDisconnectDialogOpen(false)} disabled={disconnecting}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDisconnect} disabled={disconnecting}>
                {disconnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Desconectar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div>
          <h2 className="text-base font-semibold mb-1">Templates de Mensagem</h2>
          <p className="text-sm text-muted-foreground mb-4">Gerencie os templates disponíveis para envio.</p>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !filteredTemplates || filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground font-medium">Nenhum template cadastrado</p>
            <p className="text-sm text-muted-foreground/70">Crie templates para enviar mensagens para seus clientes.</p>
            <Button onClick={openCreate} size="sm" className="mt-2">
              <Plus className="mr-2 h-4 w-4" />
              Criar primeiro template
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredTemplates.map((t) => (
              <Card key={t.id} className="transition-colors hover:bg-accent/10">
                <CardContent className="flex items-start gap-4 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground truncate">{t.label}</span>
                      {t.isActive ? (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 gap-1 text-xs">
                          <CheckCircle className="h-3 w-3" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-zinc-500 border-zinc-300 text-xs">
                          Inativo
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{t.name}</p>
                    {t.paramLabels && t.paramLabels.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t.paramsCount} parâmetro{t.paramsCount !== 1 ? "s" : ""}: {t.paramLabels.join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(t.id)}
                      disabled={deletingId === t.id}
                    >
                      {deletingId === t.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Template" : "Novo Template"}</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="tpl-name">Nome técnico *</Label>
                <Input
                  id="tpl-name"
                  placeholder="ex: appointment_confirmation_1"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Deve corresponder ao nome registrado no Meta Business.</p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="tpl-label">Rótulo *</Label>
                <Input
                  id="tpl-label"
                  placeholder="ex: Confirmação de Agendamento"
                  value={form.label}
                  onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="tpl-params">Quantidade de parâmetros</Label>
                <Input
                  id="tpl-params"
                  type="number"
                  min={0}
                  value={form.paramsCount}
                  onChange={(e) => setForm((p) => ({ ...p, paramsCount: parseInt(e.target.value) || 0 }))}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="tpl-param-labels">Labels dos parâmetros (um por linha)</Label>
                <textarea
                  id="tpl-param-labels"
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  placeholder={"Nome do cliente\nNome do serviço\nData (dd/MM/yyyy)"}
                  value={paramLabelsText}
                  onChange={(e) => setParamLabelsText(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="tpl-active"
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
                />
                <Label htmlFor="tpl-active">Template ativo</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Salvar alterações" : "Criar template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  )
}
