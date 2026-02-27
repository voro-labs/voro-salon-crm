"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import useSWR, { mutate } from "swr"
import {
  ArrowLeft,
  Phone,
  Mail,
  Edit2,
  Trash2,
  Plus,
  Loader2,
  CalendarDays,
  Banknote,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { PhoneInput } from "@/components/phone-input"
import { CurrencyInput } from "@/components/currency-input"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, "")
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return phone
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function isRecent(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  return diff < 7 * 24 * 60 * 60 * 1000
}

export default function ClienteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string

  const { data, isLoading } = useSWR(`/api/clients/${clientId}`, fetcher)
  const { data: svcData, isLoading: svcLoading } = useSWR(
    `/api/clients/${clientId}/services`,
    fetcher
  )

  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", notes: "" })
  const [editLoading, setEditLoading] = useState(false)

  const [svcOpen, setSvcOpen] = useState(false)
  const [svcForm, setSvcForm] = useState({
    description: "",
    amount: "",
    service_date: new Date().toISOString().split("T")[0],
    notes: "",
  })
  const [svcSubmitting, setSvcSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const client = data?.client
  const services = svcData?.services ?? []

  function openEdit() {
    if (client) {
      setEditForm({
        name: client.name,
        phone: client.phone,
        email: client.email || "",
        notes: client.notes || "",
      })
      setEditOpen(true)
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editForm.name.trim() || !editForm.phone.trim()) {
      toast.error("Nome e telefone sao obrigatorios.")
      return
    }
    setEditLoading(true)
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error || "Erro ao atualizar.")
        return
      }
      toast.success("Cliente atualizado!")
      setEditOpen(false)
      mutate(`/api/clients/${clientId}`)
    } catch {
      toast.error("Erro de conexao.")
    } finally {
      setEditLoading(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" })
      if (!res.ok) {
        toast.error("Erro ao excluir cliente.")
        return
      }
      toast.success("Cliente excluido!")
      router.push("/dashboard/clientes")
    } catch {
      toast.error("Erro de conexao.")
    } finally {
      setDeleting(false)
    }
  }

  async function handleAddService(e: React.FormEvent) {
    e.preventDefault()
    if (!svcForm.description.trim()) {
      toast.error("Descricao do servico e obrigatoria.")
      return
    }
    setSvcSubmitting(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...svcForm,
          amount: svcForm.amount ? parseFloat(svcForm.amount.replace(",", ".")) : 0,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error || "Erro ao registrar servico.")
        return
      }
      toast.success("Servico registrado!")
      setSvcOpen(false)
      setSvcForm({
        description: "",
        amount: "",
        service_date: new Date().toISOString().split("T")[0],
        notes: "",
      })
      mutate(`/api/clients/${clientId}/services`)
      mutate(`/api/clients/${clientId}`)
    } catch {
      toast.error("Erro de conexao.")
    } finally {
      setSvcSubmitting(false)
    }
  }

  async function handleDeleteService(serviceId: string) {
    try {
      const res = await fetch(`/api/services/${serviceId}`, { method: "DELETE" })
      if (!res.ok) {
        toast.error("Erro ao excluir servico.")
        return
      }
      toast.success("Servico excluido!")
      mutate(`/api/clients/${clientId}/services`)
      mutate(`/api/clients/${clientId}`)
    } catch {
      toast.error("Erro de conexao.")
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/clientes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-3">
              <div className="h-5 w-48 animate-pulse rounded bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-4 w-56 animate-pulse rounded bg-muted" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-muted-foreground">Cliente nao encontrado.</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/clientes">Voltar</Link>
        </Button>
      </div>
    )
  }

  const totalSpent = services.reduce(
    (sum: number, s: { amount: number }) => sum + (s.amount || 0),
    0
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/clientes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="flex-1 truncate text-2xl font-bold tracking-tight text-foreground">
          {client.name}
        </h1>
      </div>

      {/* Client info card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
                {client.name
                  .split(" ")
                  .map((n: string) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-foreground">{client.name}</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {formatPhone(client.phone)}
                  </span>
                  {client.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      {client.email}
                    </span>
                  )}
                </div>
                {client.notes && (
                  <p className="mt-1 text-sm text-muted-foreground">{client.notes}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={openEdit}>
                <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                Editar
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Essa acao ira remover {client.name} e todo o historico de servicos. Essa acao
                      nao pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={deleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Summary stats */}
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Servicos Realizados</span>
              <span className="text-lg font-semibold text-foreground">{services.length}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Total Gasto</span>
              <span className="text-lg font-semibold text-foreground">
                {formatCurrency(totalSpent)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Cliente desde</span>
              <span className="text-lg font-semibold text-foreground">
                {formatDate(client.created_at)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-foreground">Historico de Servicos</CardTitle>
            <CardDescription>Servicos realizados para este cliente</CardDescription>
          </div>
          <Dialog open={svcOpen} onOpenChange={setSvcOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Registrar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Servico</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddService} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="svc-desc">Descricao *</Label>
                  <Input
                    id="svc-desc"
                    placeholder="Ex: Corte + Escova"
                    value={svcForm.description}
                    onChange={(e) => setSvcForm((p) => ({ ...p, description: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="svc-price">Valor (R$)</Label>
                    <CurrencyInput
                      id="svc-price"
                      value={svcForm.amount}
                      onChange={(v) => setSvcForm((p) => ({ ...p, amount: v }))}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="svc-date">Data</Label>
                    <Input
                      id="svc-date"
                      type="date"
                      value={svcForm.service_date}
                      onChange={(e) =>
                        setSvcForm((p) => ({ ...p, service_date: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="svc-notes">Observacoes</Label>
                  <Textarea
                    id="svc-notes"
                    rows={2}
                    placeholder="Anotacoes sobre o servico..."
                    value={svcForm.notes}
                    onChange={(e) => setSvcForm((p) => ({ ...p, notes: e.target.value }))}
                  />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Cancelar
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={svcSubmitting}>
                    {svcSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {svcLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <div className="h-4 w-36 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Clock className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Nenhum servico registrado ainda.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {services.map(
                (svc: {
                  id: string
                  description: string
                  amount: number
                  service_date: string
                  notes: string
                }) => (
                  <div
                    key={svc.id}
                    className={`group flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                      isRecent(svc.service_date)
                        ? "border-primary/30 bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                      <CalendarDays className="h-4 w-4" />
                    </div>
                    <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-foreground">
                          {svc.description}
                        </span>
                        {isRecent(svc.service_date) && (
                          <Badge variant="outline" className="shrink-0 text-xs border-primary/30 text-primary">
                            Recente
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span>{formatDate(svc.service_date)}</span>
                        {svc.amount > 0 && (
                          <span className="flex items-center gap-1">
                            <Banknote className="h-3 w-3" />
                            {formatCurrency(svc.amount)}
                          </span>
                        )}
                      </div>
                      {svc.notes && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{svc.notes}</p>
                      )}
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="sr-only">Excluir servico</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir servico?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Essa acao ira remover o registro deste servico permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteService(svc.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-name">Nome *</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-phone">Telefone *</Label>
              <PhoneInput
                id="edit-phone"
                value={editForm.phone}
                onChange={(v) => setEditForm((p) => ({ ...p, phone: v }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-notes">Observacoes</Label>
              <Textarea
                id="edit-notes"
                rows={2}
                value={editForm.notes}
                onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={editLoading}>
                {editLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
