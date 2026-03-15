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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
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
import { PhoneInput } from "@/components/ui/custom/phone-input"
import { CountrySelector } from "@/components/ui/custom/country-selector"
import { flags, getCountryFromPhone } from "@/lib/flag-utils"
import { formatPhone } from "@/lib/mask-utils"
import { CurrencyInput } from "@/components/currency-input"
import { toast } from "sonner"

import { API_CONFIG, secureApiCall } from "@/lib/api"
import { AuthGuard } from "@/components/auth/auth.guard"
import { AnamnesisForm } from "@/components/anamnesis/anamnesis-form"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ClipboardList, History } from "lucide-react"

const fetcher = async (url: string) => {
  const result = await secureApiCall<any>(url, { method: "GET" })
  if (result.hasError) throw new Error(result.message || "Error")
  return result.data
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

  const { data: client, isLoading } = useSWR(`${API_CONFIG.ENDPOINTS.CLIENTS}/${clientId}`, fetcher)
  const { data: servicesData, isLoading: svcLoading } = useSWR(
    `${API_CONFIG.ENDPOINTS.SERVICE_RECORDS}?clientId=${clientId}`,
    fetcher
  )
  const { data: anamnesisHistory, isLoading: anamnesisLoading } = useSWR(
    `${API_CONFIG.ENDPOINTS.ANAMNESIS}/client/${clientId}`,
    fetcher
  )
  const { data: catalogServices } = useSWR(API_CONFIG.ENDPOINTS.SERVICES, fetcher)

  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", notes: "" })
  const [editLoading, setEditLoading] = useState(false)
  const [countryCode, setCountryCode] = useState("BR")

  const [svcOpen, setSvcOpen] = useState(false)
  const [svcForm, setSvcForm] = useState({
    serviceId: "none",
    description: "",
    amount: 0,
    serviceDate: new Date().toISOString().split("T")[0],
    notes: "",
  })
  const [svcSubmitting, setSvcSubmitting] = useState(false)

  const [anamnesisOpen, setAnamnesisOpen] = useState(false)
  const [anamnesisResponses, setAnamnesisResponses] = useState<any[]>([])
  const [anamnesisSubmitting, setAnamnesisSubmitting] = useState(false)

  const [deleting, setDeleting] = useState(false)

  const services = servicesData ?? []

  function openEdit() {
    if (client) {
      const { countryCode, phoneNumber } = getCountryFromPhone(client.phone)
      setEditForm({
        name: client.name,
        phone: phoneNumber,
        email: client.email || "",
        notes: client.notes || "",
      })
      setCountryCode(countryCode)
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
      const dialCode = flags[countryCode]?.dialCodeOnlyNumber || ""
      const phoneForApi = `${dialCode}${editForm.phone}`

      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.CLIENTS}/${clientId}`, {
        method: "PUT",
        body: JSON.stringify({
          ...editForm,
          phone: phoneForApi
        }),
      })
      if (res.hasError) {
        toast.error(res.message || "Erro ao atualizar.")
        return
      }
      toast.success("Cliente atualizado!")
      setEditOpen(false)
      mutate(`${API_CONFIG.ENDPOINTS.CLIENTS}/${clientId}`)
    } catch {
      toast.error("Erro de conexao.")
    } finally {
      setEditLoading(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.CLIENTS}/${clientId}`, { method: "DELETE" })
      if (res.hasError) {
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
      toast.error("Descricao do serviço e obrigatoria.")
      return
    }
    setSvcSubmitting(true)
    try {
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.SERVICE_RECORDS}`, {
        method: "POST",
        body: JSON.stringify({
          ...svcForm,
          clientId: clientId,
          serviceId: svcForm.serviceId === "none" ? null : svcForm.serviceId,
        }),
      })
      if (res.hasError) {
        toast.error(res.message || "Erro ao registrar serviço.")
        return
      }
      toast.success("Serviço registrado!")
      setSvcOpen(false)
      setSvcForm({
        serviceId: "none",
        description: "",
        amount: 0,
        serviceDate: new Date().toISOString().split("T")[0],
        notes: "",
      })
      mutate(`${API_CONFIG.ENDPOINTS.SERVICE_RECORDS}?clientId=${clientId}`)
      mutate(`${API_CONFIG.ENDPOINTS.CLIENTS}/${clientId}`)
    } catch {
      toast.error("Erro de conexao.")
    } finally {
      setSvcSubmitting(false)
    }
  }
  
  async function handleAnamnesisSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (anamnesisResponses.length === 0) {
      toast.error("Por favor, preencha pelo menos uma resposta.")
      return
    }
    setAnamnesisSubmitting(true)
    try {
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.ANAMNESIS}`, {
        method: "POST",
        body: JSON.stringify({
          clientId: clientId,
          professionalId: "00000000-0000-0000-0000-000000000000",
          date: new Date().toISOString(),
          responses: anamnesisResponses,
          signatures: [],
          evidences: []
        }),
      })
      if (res.hasError) {
        toast.error(res.message || "Erro ao salvar anamnese.")
        return
      }
      toast.success("Anamnese salva com sucesso!")
      setAnamnesisOpen(false)
      setAnamnesisResponses([])
      mutate(`${API_CONFIG.ENDPOINTS.ANAMNESIS}/client/${clientId}`)
    } catch {
      toast.error("Erro de conexao.")
    } finally {
      setAnamnesisSubmitting(false)
    }
  }

  async function handleDeleteService(serviceId: string) {
    try {
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.SERVICE_RECORDS}/${serviceId}`, { method: "DELETE" })
      if (res.hasError) {
        toast.error("Erro ao excluir serviço.")
        return
      }
      toast.success("Serviço excluido!")
      mutate(`${API_CONFIG.ENDPOINTS.SERVICE_RECORDS}?clientId=${clientId}`)
      mutate(`${API_CONFIG.ENDPOINTS.CLIENTS}/${clientId}`)
    } catch {
      toast.error("Erro de conexao.")
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
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
          <Link href="/clients">Voltar</Link>
        </Button>
      </div>
    )
  }

  const totalSpent = services.reduce(
    (sum: number, s: { amount: number }) => sum + (s.amount || 0),
    0
  )

  return (
    <AuthGuard requiredRoles={["User"]}>
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/clients">
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-base sm:text-lg">
                  {client.name
                    .split(" ")
                    .map((n: string) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <h2 className="text-lg font-bold text-foreground text-balance truncate">{client.name}</h2>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      <Phone className="h-3.5 w-3.5" />
                      {formatPhone(client.phone)}
                    </span>
                    {client.email && (
                      <span className="flex items-center gap-1.5 truncate">
                        <Mail className="h-3.5 w-3.5" />
                        {client.email}
                      </span>
                    )}
                  </div>
                  {client.notes && (
                    <p className="mt-1 text-xs text-muted-foreground text-balance line-clamp-2">{client.notes}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={openEdit} className="flex-1 sm:flex-none">
                  <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                  Editar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 sm:flex-none border-destructive/40 text-destructive hover:bg-destructive hover:text-white hover:border-destructive"
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="sm:max-w-[425px]">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Essa ação irá remover {client.name} e todo o histórico de serviços. Essa ação não pode ser desfeita.
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
            <div className="mt-4 grid grid-cols-2 xs:grid-cols-3 gap-3 border-t border-border pt-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">Serviços</span>
                <span className="text-base sm:text-lg font-bold text-foreground">{services.length}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Gasto</span>
                <span className="text-base sm:text-lg font-bold text-foreground">
                  {formatCurrency(totalSpent)}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 xs:col-span-1 col-span-2">
                <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium text-balance">Cliente desde</span>
                <span className="text-base sm:text-lg font-bold text-foreground">
                  {formatDate(client.createdAt)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for History */}
        <Tabs defaultValue="services" className="w-full">
          <TabsList className="w-full sm:w-auto grid grid-cols-2">
            <TabsTrigger value="services">
              <CalendarDays className="h-4 w-4" />
              Serviços
            </TabsTrigger>
            <TabsTrigger value="anamnesis">
              <ClipboardList className="h-4 w-4" />
              Anamnese
            </TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-foreground">Historico de Serviços</CardTitle>
                  <CardDescription>Serviços realizados para este cliente</CardDescription>
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
                      <DialogTitle>Registrar Serviço</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddService} className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="svc-catalog">Serviço Predefinido</Label>
                        <Select
                          key={catalogServices?.id}
                          value={svcForm.serviceId || "none"}
                          onValueChange={(val) => {
                            if (val === "none") {
                              setSvcForm((p) => ({ ...p, serviceId: "none" }))
                            } else {
                              const selected = (catalogServices || []).find((s: any) => s.id === val)
                              if (selected) {
                                setSvcForm((p) => ({
                                  ...p,
                                  serviceId: val,
                                  description: selected.name,
                                  amount: selected.price,
                                }))
                              }
                            }
                          }}
                        >
                          <SelectTrigger id="svc-catalog" className="w-full">
                            <SelectValue placeholder="Selecione um serviço (opcional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhum (personalizado)</SelectItem>
                            {(catalogServices || []).map((s: any) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name} - {formatCurrency(s.price)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label htmlFor="svc-desc">Descrição *</Label>
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
                            value={svcForm.serviceDate}
                            onChange={(e) =>
                              setSvcForm((p) => ({ ...p, serviceDate: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="svc-notes">Observações</Label>
                        <Textarea
                          id="svc-notes"
                          rows={2}
                          placeholder="Anotações sobre o serviço..."
                          value={svcForm.notes}
                          onChange={(e) => setSvcForm((p) => ({ ...p, notes: e.target.value }))}
                        />
                      </div>
                      <DialogFooter className="gap-2 sm:gap-0">
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
                    <p className="text-sm text-muted-foreground">Nenhum serviço registrado ainda.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {services.map(
                      (svc: {
                        id: string
                        description: string
                        amount: number
                        serviceDate: string
                        notes: string
                      }) => (
                        <div
                          key={svc.id}
                          className={`group flex items-start gap-3 rounded-lg border p-3 transition-colors ${isRecent(svc.serviceDate)
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
                              {isRecent(svc.serviceDate) && (
                                <Badge variant="outline" className="shrink-0 text-xs border-primary/30 text-primary">
                                  Recente
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                              <span>{formatDate(svc.serviceDate)}</span>
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
                                <span className="sr-only">Excluir serviço</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir serviço?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Essa acao ira remover o registro deste serviço permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteService(svc.id)}
                                  className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
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
          </TabsContent>

          <TabsContent value="anamnesis" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-foreground text-lg">Histórico de Anamnese</CardTitle>
                  <CardDescription>Avaliações capilares registradas</CardDescription>
                </div>
                <Dialog open={anamnesisOpen} onOpenChange={setAnamnesisOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Nova Avaliação
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0">
                    <DialogHeader className="px-6 py-4 border-b">
                      <DialogTitle>Nova Ficha de Anamnese</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden">
                      <ScrollArea className="h-full px-6 py-4">
                        <AnamnesisForm onChange={setAnamnesisResponses} />
                      </ScrollArea>
                    </div>
                    <DialogFooter className="px-6 py-4 border-t flex-row justify-end gap-2">
                      <DialogClose asChild>
                        <Button type="button" variant="outline">Cancelar</Button>
                      </DialogClose>
                      <Button
                        onClick={handleAnamnesisSubmit}
                        disabled={anamnesisSubmitting || anamnesisResponses.length === 0}
                      >
                        {anamnesisSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Avaliação
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {anamnesisLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="h-24 w-full animate-pulse rounded-lg bg-muted" />
                    ))}
                  </div>
                ) : !anamnesisHistory || anamnesisHistory.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-center text-muted-foreground bg-muted/10 rounded-xl border border-dashed">
                    <ClipboardList className="mb-3 h-10 w-10 opacity-30" />
                    <p className="text-sm">Nenhuma ficha de anamnese registrada.</p>
                    <Button
                      variant="link"
                      onClick={() => setAnamnesisOpen(true)}
                      className="mt-2"
                    >
                      Criar primeira avaliação
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {anamnesisHistory.map((sheet: any) => (
                      <div
                        key={sheet.id}
                        className="group flex items-center justify-between p-4 rounded-xl border border-border bg-card transition-all hover:border-primary/50 hover:shadow-sm"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <History className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground">
                              {new Date(sheet.date).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                              })}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-500" />
                                {sheet.responses.length} respostas registradas
                              </span>
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/clients/${clientId}/anamnesis/${sheet.id}`}>
                            Ver Detalhes
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
                <div className="flex gap-2">
                  <div className="w-[120px] shrink-0">
                    <CountrySelector
                      value={countryCode}
                      onChange={setCountryCode}
                    />
                  </div>
                  <div className="flex-1">
                    <PhoneInput
                      id="edit-phone"
                      value={editForm.phone}
                      autoComplete="tel"
                      onChange={(v) => setEditForm((p) => ({ ...p, phone: v }))}
                      countryCode={countryCode}
                      required
                    />
                  </div>
                </div>
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
    </AuthGuard>
  )
}
