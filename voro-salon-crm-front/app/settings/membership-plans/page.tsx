"use client"

import { useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  CreditCard,
  Infinity,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { AuthGuard } from "@/components/auth/auth.guard"
import { CurrencyInput } from "@/components/currency-input"
import { toast } from "sonner"
import { API_CONFIG, authenticatedApiCall } from "@/lib/api"

interface MembershipPlan {
  id: string
  name: string
  description: string | null
  price: number
  sessions: number | null
  durationDays: number
  isActive: boolean
  createdAt: string
}

const defaultForm = {
  name: "",
  description: "",
  price: 0,
  sessions: "" as string | number,
  durationDays: 30,
  isActive: true,
  unlimitedSessions: false,
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val)
}

function fetcher(url: string) {
  return authenticatedApiCall<MembershipPlan[]>(url).then((r) => {
    if (r.hasError) throw new Error(r.message ?? "Erro ao carregar planos")
    return r.data ?? []
  })
}

export default function MembershipPlansPage() {
  const { data: plans, isLoading, mutate } = useSWR(
    API_CONFIG.ENDPOINTS.CLIENT_MEMBERSHIP_PLANS,
    fetcher
  )

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)

  function openCreate() {
    setEditingId(null)
    setForm(defaultForm)
    setDialogOpen(true)
  }

  function openEdit(plan: MembershipPlan) {
    setEditingId(plan.id)
    setForm({
      name: plan.name,
      description: plan.description ?? "",
      price: plan.price,
      sessions: plan.sessions ?? "",
      durationDays: plan.durationDays,
      isActive: plan.isActive,
      unlimitedSessions: plan.sessions === null,
    })
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error("Nome do plano é obrigatório.")
      return
    }
    if (!form.durationDays || form.durationDays < 1) {
      toast.error("Duração deve ser pelo menos 1 dia.")
      return
    }

    setSaving(true)
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: form.price,
      sessions: form.unlimitedSessions ? null : Number(form.sessions) || null,
      durationDays: Number(form.durationDays),
      isActive: form.isActive,
    }

    const endpoint = editingId
      ? `${API_CONFIG.ENDPOINTS.CLIENT_MEMBERSHIP_PLANS}/${editingId}`
      : API_CONFIG.ENDPOINTS.CLIENT_MEMBERSHIP_PLANS

    const result = await authenticatedApiCall(endpoint, {
      method: editingId ? "PUT" : "POST",
      body: JSON.stringify(payload),
    })

    setSaving(false)

    if (result.hasError) {
      toast.error(result.message ?? "Erro ao salvar plano.")
      return
    }

    toast.success(editingId ? "Plano atualizado." : "Plano criado.")
    setDialogOpen(false)
    mutate()
  }

  async function handleDelete(id: string) {
    const result = await authenticatedApiCall(
      `${API_CONFIG.ENDPOINTS.CLIENT_MEMBERSHIP_PLANS}/${id}`,
      { method: "DELETE" }
    )
    if (result.hasError) {
      toast.error(result.message ?? "Erro ao excluir plano.")
      return
    }
    toast.success("Plano excluído.")
    mutate()
  }

  return (
    <AuthGuard requiredRoles={["SalonOwner", "Owner"]}>
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/settings">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Planos de Assinatura</h1>
            <p className="text-sm text-muted-foreground">Gerencie os planos disponíveis para seus clientes</p>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Novo Plano
          </Button>
        </div>

        {/* Plan List */}
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 w-full animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : !plans || plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-16 text-center">
            <CreditCard className="h-10 w-10 text-muted-foreground/40" />
            <div>
              <p className="font-medium text-foreground">Nenhum plano cadastrado</p>
              <p className="text-sm text-muted-foreground">Crie o primeiro plano para seus clientes</p>
            </div>
            <Button onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              Criar Plano
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {plans.map((plan) => (
              <Card key={plan.id} className={!plan.isActive ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground">{plan.name}</span>
                          {!plan.isActive && (
                            <Badge variant="secondary" className="text-xs">Inativo</Badge>
                          )}
                        </div>
                        {plan.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{plan.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="font-semibold text-base text-foreground">{formatCurrency(plan.price)}</span>
                          <span>·</span>
                          <span>{plan.durationDays} dias</span>
                          <span>·</span>
                          {plan.sessions === null ? (
                            <span className="flex items-center gap-1">
                              <Infinity className="h-3 w-3" /> sessões ilimitadas
                            </span>
                          ) : (
                            <span>{plan.sessions} sessão{plan.sessions !== 1 ? "s" : ""}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(plan)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir plano?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O plano &quot;{plan.name}&quot; será excluído. Assinaturas ativas não serão afetadas.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(plan.id)}
                              className="bg-red-600 text-white hover:bg-red-700"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create / Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-120">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Plano" : "Novo Plano"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="plan-name">Nome *</Label>
                <Input
                  id="plan-name"
                  placeholder="Ex: Plano Mensal VIP"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="plan-desc">Descrição</Label>
                <Textarea
                  id="plan-desc"
                  rows={2}
                  placeholder="Descreva os benefícios do plano..."
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="plan-price">Valor (R$) *</Label>
                  <CurrencyInput
                    id="plan-price"
                    value={form.price}
                    onChange={(v) => setForm((p) => ({ ...p, price: v }))}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="plan-duration">Duração (dias) *</Label>
                  <Input
                    id="plan-duration"
                    type="number"
                    min={1}
                    placeholder="30"
                    value={form.durationDays}
                    onChange={(e) => setForm((p) => ({ ...p, durationDays: Number(e.target.value) }))}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="plan-unlimited">Sessões ilimitadas</Label>
                  <Switch
                    id="plan-unlimited"
                    checked={form.unlimitedSessions}
                    onCheckedChange={(v) => setForm((p) => ({ ...p, unlimitedSessions: v, sessions: v ? "" : p.sessions }))}
                  />
                </div>
                {!form.unlimitedSessions && (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="plan-sessions">Número de sessões</Label>
                    <Input
                      id="plan-sessions"
                      type="number"
                      min={1}
                      placeholder="Ex: 4"
                      value={form.sessions}
                      onChange={(e) => setForm((p) => ({ ...p, sessions: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="plan-active">Plano ativo</Label>
                <Switch
                  id="plan-active"
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  )
}
