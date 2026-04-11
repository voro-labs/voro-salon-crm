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
  Tag,
  Calendar as CalendarIcon,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
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
import { cn } from "@/lib/utils"
import { API_CONFIG, authenticatedApiCall } from "@/lib/api"
import { fetcher } from "@/lib/fetcher"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ServicePromotionDto {
  id: string
  serviceId: string
  serviceName: string
  originalPrice: number
  promotionalPrice: number
  daysOfWeek: number[] // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
  validFrom?: string   // DateOnly ISO (YYYY-MM-DD)
  validUntil?: string
  isActive: boolean
  createdAt: string
}

interface ServiceDto {
  id: string
  name: string
  price: number
  durationMinutes: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAY_LABELS: Record<number, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

const PROMOTIONS_ENDPOINT = "/ServicePromotion"
const SERVICES_ENDPOINT = API_CONFIG.ENDPOINTS.SERVICES + "?pageSize=500"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(val: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val)
}

function formatDiscount(original: number, promotional: number): string {
  if (original <= 0) return ""
  const pct = ((original - promotional) / original) * 100
  return `-${Math.round(pct)}%`
}

function formatDate(iso?: string): string {
  if (!iso) return ""
  // DateOnly comes as YYYY-MM-DD; parse in local time
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR")
}

// Turns a JS Date into a YYYY-MM-DD string for the API
function toDateOnly(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

// Parses a YYYY-MM-DD string into a JS Date at local midnight (no UTC shift)
function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}

// ---------------------------------------------------------------------------
// SWR fetchers
// ---------------------------------------------------------------------------

async function fetchPromotions(): Promise<ServicePromotionDto[]> {
  const result = await authenticatedApiCall<ServicePromotionDto[]>(PROMOTIONS_ENDPOINT, {
    method: "GET",
  })
  if (result.hasError) throw new Error(result.message ?? "Erro ao carregar promoções")
  return result.data ?? []
}

// ---------------------------------------------------------------------------
// Default form state
// ---------------------------------------------------------------------------

interface PromotionForm {
  serviceId: string
  promotionalPrice: number
  daysOfWeek: number[]
  validFrom: Date | undefined
  validUntil: Date | undefined
  isActive: boolean
}

const defaultForm: PromotionForm = {
  serviceId: "",
  promotionalPrice: 0,
  daysOfWeek: [],
  validFrom: undefined,
  validUntil: undefined,
  isActive: true,
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function ServicePromotionsPage() {
  const {
    data: promotions,
    isLoading,
    mutate,
  } = useSWR(PROMOTIONS_ENDPOINT, fetchPromotions)

  const { data: _servicesRaw } = useSWR(SERVICES_ENDPOINT, fetcher)
  const services: ServiceDto[] = _servicesRaw?.items ?? (Array.isArray(_servicesRaw) ? _servicesRaw : [])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<PromotionForm>(defaultForm)
  const [saving, setSaving] = useState(false)

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

  const selectedService = services?.find((s) => s.id === form.serviceId)

  // -------------------------------------------------------------------------
  // Dialog handlers
  // -------------------------------------------------------------------------

  function openCreate() {
    setEditingId(null)
    setForm(defaultForm)
    setDialogOpen(true)
  }

  function openEdit(promo: ServicePromotionDto) {
    setEditingId(promo.id)
    setForm({
      serviceId: promo.serviceId,
      promotionalPrice: promo.promotionalPrice,
      daysOfWeek: promo.daysOfWeek,
      validFrom: promo.validFrom ? parseDateOnly(promo.validFrom) : undefined,
      validUntil: promo.validUntil ? parseDateOnly(promo.validUntil) : undefined,
      isActive: promo.isActive,
    })
    setDialogOpen(true)
  }

  // -------------------------------------------------------------------------
  // Day of week toggle
  // -------------------------------------------------------------------------

  function toggleDay(day: number) {
    setForm((prev) => {
      const has = prev.daysOfWeek.includes(day)
      return {
        ...prev,
        daysOfWeek: has
          ? prev.daysOfWeek.filter((d) => d !== day)
          : [...prev.daysOfWeek, day].sort((a, b) => a - b),
      }
    })
  }

  // -------------------------------------------------------------------------
  // Submit
  // -------------------------------------------------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.serviceId) {
      toast.error("Selecione um serviço.")
      return
    }
    if (form.promotionalPrice <= 0) {
      toast.error("O preço promocional deve ser maior que zero.")
      return
    }
    if (form.daysOfWeek.length === 0) {
      toast.error("Selecione pelo menos um dia da semana.")
      return
    }
    if (
      form.validFrom &&
      form.validUntil &&
      form.validUntil < form.validFrom
    ) {
      toast.error("A data 'válido até' deve ser posterior a 'válido de'.")
      return
    }

    setSaving(true)

    const payload = {
      serviceId: form.serviceId,
      promotionalPrice: form.promotionalPrice,
      daysOfWeek: form.daysOfWeek,
      validFrom: form.validFrom ? toDateOnly(form.validFrom) : null,
      validUntil: form.validUntil ? toDateOnly(form.validUntil) : null,
      isActive: form.isActive,
    }

    const endpoint = editingId
      ? `${PROMOTIONS_ENDPOINT}/${editingId}`
      : PROMOTIONS_ENDPOINT

    const result = await authenticatedApiCall(endpoint, {
      method: editingId ? "PUT" : "POST",
      body: JSON.stringify(payload),
    })

    setSaving(false)

    if (result.hasError) {
      toast.error(result.message ?? "Erro ao salvar promoção.")
      return
    }

    toast.success(editingId ? "Promoção atualizada." : "Promoção criada.")
    setDialogOpen(false)
    mutate()
  }

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  async function handleDelete(id: string) {
    const result = await authenticatedApiCall(`${PROMOTIONS_ENDPOINT}/${id}`, {
      method: "DELETE",
    })
    if (result.hasError) {
      toast.error(result.message ?? "Erro ao excluir promoção.")
      return
    }
    toast.success("Promoção excluída.")
    mutate()
  }

  // -------------------------------------------------------------------------
  // Toggle active inline
  // -------------------------------------------------------------------------

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
    mutate()
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/services">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Promoções de Serviços
          </h1>
          <p className="text-sm text-muted-foreground">
            Defina preços promocionais por dia da semana para seus serviços
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          <span className="hidden sm:inline">Nova Promoção</span>
          <span className="sm:hidden">Nova</span>
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 w-full animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : !promotions || promotions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-16 text-center">
          <Tag className="h-10 w-10 text-muted-foreground/40" />
          <div>
            <p className="font-medium text-foreground">Nenhuma promoção cadastrada</p>
            <p className="text-sm text-muted-foreground">
              Crie uma promoção para oferecer descontos em dias específicos
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            Criar Promoção
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {promotions.map((promo) => (
            <Card key={promo.id} className={cn(!promo.isActive && "opacity-60")}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Icon + info */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Tag className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col gap-1 min-w-0">
                      {/* Service name + status */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {promo.serviceName}
                        </span>
                        {!promo.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            Inativo
                          </Badge>
                        )}
                      </div>

                      {/* Prices */}
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-muted-foreground line-through">
                          {formatCurrency(promo.originalPrice)}
                        </span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(promo.promotionalPrice)}
                        </span>
                        {promo.originalPrice > 0 && (
                          <Badge
                            variant="outline"
                            className="text-xs border-green-500 text-green-600"
                          >
                            {formatDiscount(promo.originalPrice, promo.promotionalPrice)}
                          </Badge>
                        )}
                      </div>

                      {/* Days of week */}
                      <div className="flex flex-wrap gap-1 mt-0.5">
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

                      {/* Validity period */}
                      {(promo.validFrom || promo.validUntil) && (
                        <p className="text-xs text-muted-foreground">
                          {promo.validFrom && `De ${formatDate(promo.validFrom)}`}
                          {promo.validFrom && promo.validUntil && " "}
                          {promo.validUntil && `até ${formatDate(promo.validUntil)}`}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Switch
                      checked={promo.isActive}
                      onCheckedChange={() => handleToggleActive(promo)}
                      aria-label={promo.isActive ? "Desativar promoção" : "Ativar promoção"}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(promo)}
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
                            A promoção do serviço &quot;{promo.serviceName}&quot; será excluída
                            permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(promo.id)}
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
        <DialogContent className="sm:max-w-130">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Promoção" : "Nova Promoção"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Service select */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="promo-service">Serviço *</Label>
              <Select
                value={form.serviceId}
                onValueChange={(v) => {
                  const svc = services?.find((s) => s.id === v)
                  setForm((prev) => ({
                    ...prev,
                    serviceId: v,
                    // Pre-fill promotional price with current service price when creating
                    promotionalPrice:
                      !editingId && svc ? svc.price : prev.promotionalPrice,
                  }))
                }}
                disabled={!!editingId}
              >
                <SelectTrigger id="promo-service" className="w-full">
                  <SelectValue placeholder="Selecione um serviço" />
                </SelectTrigger>
                <SelectContent>
                  {services?.map((svc) => (
                    <SelectItem key={svc.id} value={svc.id}>
                      {svc.name} — {formatCurrency(svc.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedService && (
                <p className="text-xs text-muted-foreground">
                  Preço original: {formatCurrency(selectedService.price)}
                </p>
              )}
            </div>

            {/* Promotional price */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="promo-price">Preço Promocional *</Label>
              <CurrencyInput
                id="promo-price"
                value={form.promotionalPrice}
                onChange={(v) => setForm((prev) => ({ ...prev, promotionalPrice: v }))}
              />
              {selectedService && form.promotionalPrice > 0 && (
                <p className="text-xs text-muted-foreground">
                  Desconto:{" "}
                  <span className="font-medium text-green-600">
                    {formatDiscount(selectedService.price, form.promotionalPrice)}
                  </span>
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
                      checked={form.daysOfWeek.includes(day)}
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
                        !form.validFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.validFrom
                        ? format(form.validFrom, "dd/MM/yyyy")
                        : "Opcional"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.validFrom}
                      onSelect={(date) =>
                        setForm((prev) => ({ ...prev, validFrom: date ?? undefined }))
                      }
                      initialFocus
                      locale={ptBR}
                    />
                    {form.validFrom && (
                      <div className="p-2 border-t">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() =>
                            setForm((prev) => ({ ...prev, validFrom: undefined }))
                          }
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
                        !form.validUntil && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.validUntil
                        ? format(form.validUntil, "dd/MM/yyyy")
                        : "Opcional"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.validUntil}
                      onSelect={(date) =>
                        setForm((prev) => ({ ...prev, validUntil: date ?? undefined }))
                      }
                      disabled={(date) =>
                        form.validFrom ? date < form.validFrom : false
                      }
                      initialFocus
                      locale={ptBR}
                    />
                    {form.validUntil && (
                      <div className="p-2 border-t">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() =>
                            setForm((prev) => ({ ...prev, validUntil: undefined }))
                          }
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
                checked={form.isActive}
                onCheckedChange={(v) => setForm((prev) => ({ ...prev, isActive: v }))}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
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
  )
}
