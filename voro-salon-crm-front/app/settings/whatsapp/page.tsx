"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Plus, Pencil, Trash2, MessageSquare, Loader2, X, CheckCircle } from "lucide-react"
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

export default function WhatsAppTemplatesPage() {
  const router = useRouter()
  const { hasWhatsAppBot, isLoaded } = usePlanLimits()

  const { data: templates, isLoading, mutate } = useSWR<WhatsAppTemplate[]>(
    API_CONFIG.ENDPOINTS.WHATSAPP_TEMPLATES,
    fetcher
  )

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<WhatsAppTemplate | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [paramLabelsText, setParamLabelsText] = useState("")
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

  return (
    <AuthGuard requiredRoles={["SalonOwner", "Owner"]}>
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <PageHeader
          title="Templates WhatsApp"
          description="Gerencie os templates de mensagem disponíveis para envio."
          action={
            <Button onClick={openCreate} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Novo Template
            </Button>
          }
        />

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
