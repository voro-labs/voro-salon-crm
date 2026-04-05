"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import useSWR, { mutate as globalMutate } from "swr"
import {
  ArrowLeft,
  Loader2,
  Tag,
  Trash2,
  Plus,
  Edit2,
  Calendar as CalendarIcon,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { CurrencyInput } from "@/components/currency-input"
import { AuthGuard } from "@/components/auth/auth.guard"
import { useServiceDetail } from "@/hooks/use-service-detail.hook"
import { useSettings } from "@/hooks/use-settings.hook"
import { getServicePlaceholders } from "@/lib/branding"
import { EstablishmentType } from "@/types/Enums/establishmentType.enum"
import { cn } from "@/lib/utils"
import { authenticatedApiCall } from "@/lib/api"
import { fetcher } from "@/lib/fetcher"

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

interface ServicePromotionDto {
  id: string
  serviceId: string
  serviceName: string
  originalPrice: number
  promotionalPrice: number
  daysOfWeek: number[]
  validFrom?: string
  validUntil?: string
  isActive: boolean
  createdAt: string
}

interface PromotionForm {
  promotionalPrice: number
  daysOfWeek: number[]
  validFrom: Date | undefined
  validUntil: Date | undefined
  isActive: boolean
}

const defaultPromoForm: PromotionForm = {
  promotionalPrice: 0,
  daysOfWeek: [],
  validFrom: undefined,
  validUntil: undefined,
  isActive: true,
}

const DAY_LABELS: Record<number, string> = {
  0: "Dom", 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sáb",
}
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]
const PROMOTIONS_ENDPOINT = "/ServicePromotion"

function formatCurrency(val: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val)
}

function formatDiscount(original: number, promotional: number): string {
  if (original <= 0) return ""
  return `-${Math.round(((original - promotional) / original) * 100)}%`
}

function formatDateOnly(iso?: string): string {
  if (!iso) return ""
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR")
}

function toDateOnly(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EditarServicoPage() {
  const params = useParams()
  const serviceId = params.id as string

  const {
    service,
    form,
    setForm,
    isLoading,
    isSaving,
    isDeleting,
    activePromotion,
    updateService,
    deleteService,
  } = useServiceDetail(serviceId)

  const { tenant } = useSettings()
  const placeholders = getServicePlaceholders(tenant?.establishmentType ?? EstablishmentType.Salon)

  // ── Promotions ────────────────────────────────────────────────────────────

  const promoKey = serviceId ? `${PROMOTIONS_ENDPOINT}?serviceId=${serviceId}` : null
  const { data: _promosRaw, mutate: mutatePromos } = useSWR(promoKey, fetcher)
  const promotions: ServicePromotionDto[] = (() => {
    if (!_promosRaw) return []
    if (Array.isArray(_promosRaw)) return _promosRaw
    if (Array.isArray(_promosRaw?.items)) return _promosRaw.items
    if (Array.isArray(_promosRaw?.data)) return _promosRaw.data
    return []
  })()

  const [promoDialogOpen, setPromoDialogOpen] = useState(false)
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null)
  const [promoForm, setPromoForm] = useState<PromotionForm>(defaultPromoForm)
  const [savingPromo, setSavingPromo] = useState(false)

  function openCreatePromo() {
    setEditingPromoId(null)
    setPromoForm({ ...defaultPromoForm, promotionalPrice: service?.price ?? 0 })
    setPromoDialogOpen(true)
  }

  function openEditPromo(promo: ServicePromotionDto) {
    setEditingPromoId(promo.id)
    setPromoForm({
      promotionalPrice: promo.promotionalPrice,
      daysOfWeek: promo.daysOfWeek,
      validFrom: promo.validFrom ? parseDateOnly(promo.validFrom) : undefined,
      validUntil: promo.validUntil ? parseDateOnly(promo.validUntil) : undefined,
      isActive: promo.isActive,
    })
    setPromoDialogOpen(true)
  }

  function toggleDay(day: number) {
    setPromoForm((prev) => {
      const has = prev.daysOfWeek.includes(day)
      return {
        ...prev,
        daysOfWeek: has
          ? prev.daysOfWeek.filter((d) => d !== day)
          : [...prev.daysOfWeek, day].sort((a, b) => a - b),
      }
    })
  }

  async function handlePromoSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (promoForm.promotionalPrice <= 0) {
      toast.error("O preço promocional deve ser maior que zero.")
      return
    }
    if (promoForm.daysOfWeek.length === 0) {
      toast.error("Selecione pelo menos um dia da semana.")
      return
    }
    if (promoForm.validFrom && promoForm.validUntil && promoForm.validUntil < promoForm.validFrom) {
      toast.error("A data 'válido até' deve ser posterior a 'válido de'.")
      return
    }

    setSavingPromo(true)
    const payload = {
      serviceId,
      promotionalPrice: promoForm.promotionalPrice,
      daysOfWeek: promoForm.daysOfWeek,
      validFrom: promoForm.validFrom ? toDateOnly(promoForm.validFrom) : null,
      validUntil: promoForm.validUntil ? toDateOnly(promoForm.validUntil) : null,
      isActive: promoForm.isActive,
    }

    const endpoint = editingPromoId
      ? `${PROMOTIONS_ENDPOINT}/${editingPromoId}`
      : PROMOTIONS_ENDPOINT

    const result = await authenticatedApiCall(endpoint, {
      method: editingPromoId ? "PUT" : "POST",
      body: JSON.stringify(payload),
    })
    setSavingPromo(false)

    if (result.hasError) {
      toast.error(result.message ?? "Erro ao salvar promoção.")
      return
    }

    toast.success(editingPromoId ? "Promoção atualizada." : "Promoção criada.")
    setPromoDialogOpen(false)
    mutatePromos()
    globalMutate(PROMOTIONS_ENDPOINT)
  }

  async function handlePromoDelete(id: string) {
    const result = await authenticatedApiCall(`${PROMOTIONS_ENDPOINT}/${id}`, { method: "DELETE" })
    if (result.hasError) {
      toast.error(result.message ?? "Erro ao excluir promoção.")
      return
    }
    toast.success("Promoção excluída.")
    mutatePromos()
    globalMutate(PROMOTIONS_ENDPOINT)
  }

  async function handleToggleActive(promo: ServicePromotionDto) {
    const result = await authenticatedApiCall(`${PROMOTIONS_ENDPOINT}/${promo.id}`, {
      method: "PUT",
      body: JSON.stringify({
        serviceId: promo.serviceId,
        promotionalPrice: promo.promotionalPrice,
        daysOfWeek: promo.daysOfWeek,
        validFrom: promo.validFrom ?? null,
        validUntil: promo.validUntil ?? null,
        isActive: !promo.isActive,
      }),
    })
    if (result.hasError) {
      toast.error(result.message ?? "Erro ao atualizar status.")
      return
    }
    toast.success(promo.isActive ? "Promoção desativada." : "Promoção ativada.")
    mutatePromos()
    globalMutate(PROMOTIONS_ENDPOINT)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/services">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-20 w-full animate-pulse rounded bg-muted" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <AuthGuard requiredRoles={["SalonOwner", "Owner"]}>
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/services">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight text-foreground truncate max-w-50 sm:max-w-md">
              Editar: {service?.name}
            </h1>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="border-destructive/40 text-destructive hover:bg-destructive hover:text-white">
                <Trash2 className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Excluir</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir serviço do catálogo?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso não afetará os registros de serviços já realizados para os clientes, mas
                  o serviço não estará mais disponível para novas seleções.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={deleteService}
                  disabled={isDeleting}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Service form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Dados do Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); updateService(form) }} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder={placeholders.name}
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="price">Preço Padrão (R$) *</Label>
                <CurrencyInput
                  id="price"
                  value={form.price}
                  onChange={(v) => setForm((p) => ({ ...p, price: v }))}
                />
                {activePromotion && (
                  <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 dark:border-green-800 dark:bg-green-950/30">
                    <Tag className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-muted-foreground">
                      Promoção hoje:{" "}
                      <span className="line-through">
                        R$ {form.price.toFixed(2).replace(".", ",")}
                      </span>{" "}
                      <span className="font-semibold text-green-700 dark:text-green-400">
                        R$ {activePromotion.promotionalPrice.toFixed(2).replace(".", ",")}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="durationMinutes">Duração Estimada</Label>
                <Select
                  key={form.durationMinutes}
                  value={form.durationMinutes.toString()}
                  onValueChange={(v) => setForm((p) => ({ ...p, durationMinutes: parseInt(v) }))}
                >
                  <SelectTrigger id="durationMinutes" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1h 30min</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descrição opcional..."
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Alterações
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/services">Cancelar</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Promotions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground">Promoções</CardTitle>
              <Button size="sm" onClick={openCreatePromo}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Nova Promoção
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {promotions.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-10 text-center">
                <Tag className="h-8 w-8 text-muted-foreground/40" />
                <div>
                  <p className="text-sm font-medium text-foreground">Nenhuma promoção cadastrada</p>
                  <p className="text-xs text-muted-foreground">
                    Crie preços promocionais por dia da semana para este serviço
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={openCreatePromo}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Criar Promoção
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {promotions.map((promo) => (
                  <div
                    key={promo.id}
                    className={cn(
                      "flex items-start justify-between gap-4 rounded-lg border p-3",
                      !promo.isActive && "opacity-60"
                    )}
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      {/* Status badge */}
                      {!promo.isActive && (
                        <Badge variant="secondary" className="w-fit text-xs">Inativo</Badge>
                      )}

                      {/* Prices */}
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-muted-foreground line-through">
                          {formatCurrency(promo.originalPrice)}
                        </span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(promo.promotionalPrice)}
                        </span>
                        {promo.originalPrice > 0 && (
                          <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                            {formatDiscount(promo.originalPrice, promo.promotionalPrice)}
                          </Badge>
                        )}
                      </div>

                      {/* Days of week */}
                      <div className="flex flex-wrap gap-1">
                        {ALL_DAYS.map((day) => (
                          <Badge
                            key={day}
                            variant={promo.daysOfWeek.includes(day) ? "default" : "outline"}
                            className="text-xs px-1.5 py-0"
                          >
                            {DAY_LABELS[day]}
                          </Badge>
                        ))}
                      </div>

                      {/* Validity */}
                      {(promo.validFrom || promo.validUntil) && (
                        <p className="text-xs text-muted-foreground">
                          {promo.validFrom && `De ${formatDateOnly(promo.validFrom)}`}
                          {promo.validFrom && promo.validUntil && " "}
                          {promo.validUntil && `até ${formatDateOnly(promo.validUntil)}`}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Switch
                        checked={promo.isActive}
                        onCheckedChange={() => handleToggleActive(promo)}
                        aria-label={promo.isActive ? "Desativar" : "Ativar"}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditPromo(promo)}
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
                            <AlertDialogTitle>Excluir promoção?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta promoção será excluída permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handlePromoDelete(promo.id)}
                              className="bg-red-600 text-white hover:bg-red-700"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Promotion dialog */}
        <Dialog open={promoDialogOpen} onOpenChange={setPromoDialogOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>{editingPromoId ? "Editar Promoção" : "Nova Promoção"}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handlePromoSubmit} className="flex flex-col gap-5">
              {/* Promotional price */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="promo-price">Preço Promocional *</Label>
                <CurrencyInput
                  id="promo-price"
                  value={promoForm.promotionalPrice}
                  onChange={(v) => setPromoForm((p) => ({ ...p, promotionalPrice: v }))}
                />
                {service && promoForm.promotionalPrice > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Desconto:{" "}
                    <span className="font-medium text-green-600">
                      {formatDiscount(service.price, promoForm.promotionalPrice)}
                    </span>
                    {" "}(preço original: {formatCurrency(service.price)})
                  </p>
                )}
              </div>

              {/* Days of week */}
              <div className="flex flex-col gap-2">
                <Label>Dias da Semana *</Label>
                <div className="flex flex-wrap gap-3">
                  {ALL_DAYS.map((day) => (
                    <label
                      key={day}
                      className="flex items-center gap-1.5 cursor-pointer select-none text-sm"
                    >
                      <Checkbox
                        checked={promoForm.daysOfWeek.includes(day)}
                        onCheckedChange={() => toggleDay(day)}
                      />
                      {DAY_LABELS[day]}
                    </label>
                  ))}
                </div>
              </div>

              {/* Validity period */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label>Válido de</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !promoForm.validFrom && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {promoForm.validFrom ? format(promoForm.validFrom, "dd/MM/yyyy") : "Opcional"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={promoForm.validFrom}
                        onSelect={(date) => setPromoForm((p) => ({ ...p, validFrom: date ?? undefined }))}
                        initialFocus
                        locale={ptBR}
                      />
                      {promoForm.validFrom && (
                        <div className="p-2 border-t">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => setPromoForm((p) => ({ ...p, validFrom: undefined }))}
                          >
                            Limpar
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Válido até</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !promoForm.validUntil && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {promoForm.validUntil ? format(promoForm.validUntil, "dd/MM/yyyy") : "Opcional"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={promoForm.validUntil}
                        onSelect={(date) => setPromoForm((p) => ({ ...p, validUntil: date ?? undefined }))}
                        disabled={(date) => promoForm.validFrom ? date < promoForm.validFrom : false}
                        initialFocus
                        locale={ptBR}
                      />
                      {promoForm.validUntil && (
                        <div className="p-2 border-t">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => setPromoForm((p) => ({ ...p, validUntil: undefined }))}
                          >
                            Limpar
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between">
                <Label htmlFor="promo-active">Promoção ativa</Label>
                <Switch
                  id="promo-active"
                  checked={promoForm.isActive}
                  onCheckedChange={(v) => setPromoForm((p) => ({ ...p, isActive: v }))}
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={savingPromo}>
                  {savingPromo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
