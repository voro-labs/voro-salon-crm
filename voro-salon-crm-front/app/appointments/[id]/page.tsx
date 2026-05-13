"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useState, useEffect } from "react"
import {
  ArrowLeft,
  Loader2,
  Trash2,
  UserCheck,
  CreditCard,
  Calendar as CalendarIcon,
  Zap,
  Tag,
  MessageCircle,
  MessageSquare,
  Star,
  Send,
  Ban,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { CurrencyInput } from "@/components/ui/custom/currency-input"
import { AuthGuard } from "@/components/auth/auth.guard"
import { Badge } from "@/components/ui/badge"
import { SearchableSelect } from "@/components/ui/custom/searchable-select"
import { cn } from "@/lib/utils"
import { format, isPast } from "date-fns"
import { ptBR } from "date-fns/locale"
import useSWR from "swr"
import { toast } from "sonner"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import { useAppointmentDetail } from "@/hooks/use-appointment-detail.hook"
import { useSettings } from "@/hooks/use-settings.hook"
import { formatDuration } from "@/lib/format-utils"
import { useWhatsApp } from "@/hooks/use-whatsapp.hook"
import { getServicePlaceholders } from "@/lib/branding"
import { EstablishmentType } from "@/types/Enums/establishmentType.enum"
import { appointmentStatusConfig } from "@/components/ui/custom/status-badge"

const slotFetcher = async (url: string) => {
  const result = await secureApiCall<any>(url, { method: "GET" })
  if (result.hasError) throw new Error(result.message || "Error")
  return result.data
}

interface SelectedServiceItem {
  id: string
  name: string
  price: number
  durationMinutes: number
  category?: string | null
  promotionalPrice?: number
  hasPromotion?: boolean
}

export default function AppointmentDetailPage() {
  const params = useParams()
  const appointmentId = params.id as string
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<number | null>(null)
  const [selectedEmployeeForCompletion, setSelectedEmployeeForCompletion] = useState<string>("none")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [isEncaixe, setIsEncaixe] = useState(false)
  const [selectedServices, setSelectedServices] = useState<SelectedServiceItem[]>([])
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false)
  const [isSendingRating, setIsSendingRating] = useState(false)
  const [ratingRequestSent, setRatingRequestSent] = useState(false)
  const [existingRating, setExistingRating] = useState<{ stars: number; comment?: string } | null>(null)
  const [isFetchingRating, setIsFetchingRating] = useState(false)

  const {
    appointment,
    clients,
    services,
    employees,
    form,
    setForm,
    isLoading,
    isSaving,
    isDeleting,
    isModuleEnabled,
    updateAppointment,
    updateStatus,
    deleteAppointment,
    pendingWhatsApp,
    confirmWhatsApp,
    cancelWhatsApp,
  } = useAppointmentDetail(appointmentId)

  const { sendWhatsAppMessage } = useWhatsApp()

  const { tenant } = useSettings()
  const placeholders = getServicePlaceholders(tenant?.establishmentType ?? EstablishmentType.Salon)

  useEffect(() => {
    if (!appointment || appointment.status !== 2) return
    setIsFetchingRating(true)
    secureApiCall<{ stars: number; comment?: string }>(`/ClientRating/${appointmentId}`)
      .then((res) => { if (!res.hasError && res.data) setExistingRating(res.data) })
      .finally(() => setIsFetchingRating(false))
  }, [appointment?.id, appointment?.status])

  async function handleSendRatingRequest() {
    setIsSendingRating(true)
    try {
      const res = await secureApiCall<{
        sentViaBot: boolean
        requiresManualSend: boolean
        clientPhone?: string
        clientName?: string
        serviceName?: string
      }>(`/ClientRating/send-request/${appointmentId}`, { method: "POST" })
      if (res.hasError) { toast.error(res.message || "Erro ao enviar solicitação."); return }

      if (res.data?.requiresManualSend) {
        const phone = (res.data.clientPhone ?? "").replace(/\D/g, "")
        const clientName = res.data.clientName ?? "cliente"
        const serviceName = res.data.serviceName ?? "serviço"
        const ratingUrl = `${window.location.origin}/receipt/${appointmentId}`
        const message = `Olá ${clientName}! Ficamos felizes em atendê-lo(a) no ${serviceName}. Que tal nos deixar sua avaliação? Acesse o link: ${ratingUrl}`
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank")
        toast.info("WhatsApp aberto com solicitação de avaliação.")
      } else {
        toast.success("Solicitação de avaliação enviada via WhatsApp!")
      }

      setRatingRequestSent(true)
    } catch { toast.error("Erro de conexão.") }
    finally { setIsSendingRating(false) }
  }

  // Initialize selectedDate from loaded appointment
  useEffect(() => {
    if (form.scheduledDateTime && !selectedDate) {
      const d = new Date(form.scheduledDateTime)
      if (!isNaN(d.getTime())) setSelectedDate(d)
    }
  }, [form.scheduledDateTime])

  // Initialize selectedServices from appointment's services list or fallback to single serviceId
  useEffect(() => {
    if (!appointment || !services || selectedServices.length > 0) return

    if (appointment.services && appointment.services.length > 0) {
      const items = appointment.services.map((as: any) => {
        const svc = services.find((s: any) => s.id === as.serviceId)
        return {
          id: as.serviceId,
          name: as.serviceName || svc?.name || "",
          price: as.price || svc?.price || 0,
          durationMinutes: as.durationMinutes || svc?.durationMinutes || 0,
          category: svc?.category,
          promotionalPrice: svc?.promotionalPrice,
          hasPromotion: svc?.hasPromotion,
        }
      })
      setSelectedServices(items)
      return
    }

    if (!appointment.serviceId) return
    const svc = services.find((s: any) => s.id === appointment.serviceId)
    if (svc) {
      setSelectedServices([{
        id: svc.id, name: svc.name, price: svc.price, durationMinutes: svc.durationMinutes,
        category: svc.category, promotionalPrice: svc.promotionalPrice, hasPromotion: svc.hasPromotion,
      }])
    }
  }, [appointment?.serviceId, appointment?.services, services])

  function toggleService(s: any) {
    setSelectedServices(prev => {
      const isSelected = prev.some(sel => sel.id === s.id)
      let next: SelectedServiceItem[]
      if (isSelected) {
        next = prev.filter(sel => sel.id !== s.id)
      } else {
        const item: SelectedServiceItem = {
          id: s.id, name: s.name, price: s.price, durationMinutes: s.durationMinutes,
          category: s.category, promotionalPrice: s.promotionalPrice, hasPromotion: s.hasPromotion,
        }
        next = s.category
          ? [...prev.filter(sel => sel.category !== s.category), item]
          : [...prev, item]
      }

      if (next.length === 0) {
        setForm(p => ({ ...p, serviceId: "none", serviceIds: [] }))
      } else if (next.length === 1) {
        const svc = next[0]
        const effectivePrice = svc.hasPromotion && svc.promotionalPrice ? svc.promotionalPrice : svc.price
        setForm(p => ({
          ...p,
          serviceId: svc.id,
          serviceIds: [svc.id],
          employeeId: "none",
          amount: effectivePrice,
          durationMinutes: svc.durationMinutes,
          description: p.description || svc.name,
        }))
      } else {
        const totalAmount = next.reduce((sum, svc) => sum + (svc.hasPromotion && svc.promotionalPrice ? svc.promotionalPrice : svc.price), 0)
        const totalDuration = next.reduce((sum, svc) => sum + svc.durationMinutes, 0)
        setForm(p => ({ ...p, serviceId: "none", serviceIds: next.map(svc => svc.id), employeeId: "none", amount: totalAmount, durationMinutes: totalDuration, description: next.map(svc => svc.name).join(", ") }))
      }
      return next
    })
  }

  const displayPromotion = selectedServices.length === 1 && selectedServices[0].hasPromotion && selectedServices[0].promotionalPrice
    ? { originalPrice: selectedServices[0].price, promotionalPrice: selectedServices[0].promotionalPrice! }
    : null

  const { data: businessHours } = useSWR<any[]>(API_CONFIG.ENDPOINTS.BUSINESS_HOURS, slotFetcher)

  function isDateClosed(date: Date): boolean {
    if (!businessHours || businessHours.length === 0) return false
    const dow = date.getDay()
    const dayHours = businessHours.find((h: any) => h.dayOfWeek === dow)
    if (!dayHours) return true
    return !dayHours.isOpen
  }

  const selectedDateClosed = selectedDate ? isDateClosed(selectedDate) : false

  const isHistoricDate = selectedDate
    ? selectedDate < new Date(new Date().setHours(0, 0, 0, 0))
    : false

  const { data: availability, isLoading: loadingAvailability } = useSWR(
    selectedDate && !isHistoricDate
      ? `${API_CONFIG.ENDPOINTS.APPOINTMENTS_AVAILABILITY}?date=${format(selectedDate, "yyyy-MM-dd")}${form.employeeId !== "none" ? `&employeeId=${form.employeeId}` : ""}`
      : null,
    slotFetcher
  )

  async function handleStatusClick(statusKey: number) {
    const COMPLETED_STATUS = 2
    const needsEmployeeSelection =
      statusKey === COMPLETED_STATUS &&
      (form.employeeId === "none" || !form.employeeId) &&
      employees && employees.length > 0

    if (needsEmployeeSelection) {
      setPendingStatus(statusKey)
      setSelectedEmployeeForCompletion("none")
      setEmployeeDialogOpen(true)
    } else {
      await updateStatus(statusKey)
    }
  }

  async function handleConfirmEmployeeAndComplete() {
    if (pendingStatus === null) return
    if (selectedEmployeeForCompletion !== "none") {
      setForm(p => ({ ...p, employeeId: selectedEmployeeForCompletion }))
      await updateAppointment({ ...form, employeeId: selectedEmployeeForCompletion })
    }
    await updateStatus(pendingStatus)
    setEmployeeDialogOpen(false)
    setPendingStatus(null)
  }

  // Bloqueia toda a edição enquanto o agendamento estiver cancelado
  const isFormLocked = form.status === 3

  if (isLoading || !appointment || !clients || !services) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <Card><CardContent className="h-64 animate-pulse rounded bg-muted/20" /></Card>
      </div>
    )
  }

  return (
    <AuthGuard requiredRoles={["SalonOwner", "SalonEmployee", "Owner"]}>
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" asChild className="shrink-0">
              <Link href="/appointments">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground text-balance truncate">
                Agendamento: {appointment?.clientName}
              </h1>
              <p className="text-xs text-muted-foreground truncate sm:hidden">Detalhes do cliente</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none h-10 border-destructive/40 text-destructive hover:bg-destructive hover:text-white">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir agendamento?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. O agendamento será removido permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={deleteAppointment}
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
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-foreground">Editar Registros</CardTitle>
                {isFormLocked && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/40 px-3 py-2 text-sm text-red-700 dark:text-red-400 mt-2">
                    <Ban className="h-4 w-4 shrink-0" />
                    <span>Agendamento cancelado. Altere o status para liberar a edição.</span>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (isFormLocked) return
                    const originalTime = new Date(appointment.scheduledDateTime).getTime();
                    const newTime = new Date(form.scheduledDateTime).getTime();
                    const isRescheduling = originalTime !== newTime;

                    const success = await updateAppointment(form);

                    if (success && isRescheduling && !tenant?.useWhatsappBooking) {
                      setRescheduleDialogOpen(true);
                    }
                  }}
                  className="flex flex-col gap-5"
                >
                  <div className="flex flex-col gap-5">
                    {/* Cliente */}
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="clientId" className="text-sm font-semibold text-foreground">Cliente *</Label>
                      <SearchableSelect
                        id="clientId"
                        value={form.clientId}
                        onValueChange={(v) => setForm((p) => ({ ...p, clientId: v }))}
                        options={clients?.map((c: any) => ({ value: c.id, label: c.name })) ?? []}
                        placeholder="Selecione um cliente"
                        searchPlaceholder="Buscar cliente..."
                        disabled={isFormLocked}
                      />
                    </div>

                    {/* Serviços */}
                    {isModuleEnabled(3) && (
                      <div className="flex flex-col gap-2 border-t border-border/50 pt-4">
                        <Label className="text-sm font-semibold text-foreground">Serviços <span className="text-muted-foreground font-normal">(Opcional)</span></Label>
                        {services && services.length > 0 ? (() => {
                          const grouped: Record<string, any[]> = {}
                          for (const s of services) {
                            const key = s.category || ""
                            if (!grouped[key]) grouped[key] = []
                            grouped[key].push(s)
                          }
                          const hasCategories = Object.keys(grouped).some(k => k !== "")

                          const renderServiceButton = (s: any) => {
                            const isSelected = selectedServices.some(sel => sel.id === s.id)
                            const effectivePrice = s.hasPromotion && s.promotionalPrice ? s.promotionalPrice : s.price
                            return (
                              <Button
                                key={s.id}
                                type="button"
                                variant={isSelected ? "default" : "outline"}
                                disabled={isFormLocked}
                                className={cn(
                                  "h-auto py-2.5 px-3 flex flex-col items-start gap-1 text-left transition-all",
                                  isSelected
                                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                    : "bg-background hover:bg-primary/5 hover:border-primary hover:text-primary"
                                )}
                                onClick={() => toggleService(s)}
                              >
                                <div className="flex items-center gap-1 w-full">
                                  <span className="font-semibold text-xs line-clamp-1 flex-1">{s.name}</span>
                                  {s.hasPromotion && (
                                    <span className={cn(
                                      "text-[9px] font-bold px-1 py-0.5 rounded-full shrink-0",
                                      isSelected ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"
                                    )}>%</span>
                                  )}
                                </div>
                                <span className={cn("text-[10px]", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                                  {s.durationMinutes} min • R$ {effectivePrice.toFixed(2)}
                                </span>
                              </Button>
                            )
                          }

                          return hasCategories ? (
                            <div className="flex flex-col gap-3">
                              {Object.entries(grouped).map(([category, items]) => (
                                <div key={category} className="flex flex-col gap-1.5">
                                  {category && (
                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground ml-0.5">{category}</span>
                                  )}
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                    {items.map(renderServiceButton)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                              {services.map(renderServiceButton)}
                            </div>
                          )
                        })() : (
                          <p className="text-xs text-muted-foreground">Nenhum serviço cadastrado.</p>
                        )}
                        {selectedServices.length > 1 && (
                          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 flex items-center justify-between text-xs text-muted-foreground">
                            <span>{selectedServices.length} serviços • {formatDuration(selectedServices.reduce((s, svc) => s + svc.durationMinutes, 0))}</span>
                            <span className="font-bold text-foreground">
                              R$ {selectedServices.reduce((s, svc) => s + (svc.hasPromotion && svc.promotionalPrice ? svc.promotionalPrice : svc.price), 0).toFixed(2)}
                            </span>
                          </div>
                        )}
                        {displayPromotion && (
                          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                            <Tag className="h-4 w-4 shrink-0 text-emerald-600" />
                            <span>
                              Promoção aplicada:{" "}
                              <span className="line-through text-emerald-600/70">
                                {displayPromotion.originalPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </span>{" "}
                              <strong>
                                {displayPromotion.promotionalPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </strong>
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Funcionário, Data e Duração */}
                    <div className="grid gap-4 sm:grid-cols-2 border-t border-border/50 pt-4">
                      {isModuleEnabled(4) && (
                        <div className="flex flex-col gap-2">
                          <Label htmlFor="employeeId" className="text-sm font-semibold text-foreground">Funcionário <span className="text-muted-foreground font-normal">(Opcional)</span></Label>
                          <SearchableSelect
                            id="employeeId"
                            value={form.employeeId}
                            onValueChange={(v) => setForm((p) => ({ ...p, employeeId: v }))}
                            options={[
                              { value: "none", label: "Qualquer um" },
                              ...(employees?.map((e: any) => ({ value: e.id, label: e.name })) ?? []),
                            ]}
                            placeholder="Selecione um funcionário"
                            searchPlaceholder="Buscar funcionário..."
                            disabled={isFormLocked}
                          />
                        </div>
                      )}

                      <div className="flex flex-col gap-2">
                        <Label className="text-sm font-semibold text-foreground">Data *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              disabled={isFormLocked}
                              className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={(date) => {
                                setSelectedDate(date)
                                setForm((p) => ({ ...p, scheduledDateTime: "" }))
                              }}
                              initialFocus
                              locale={ptBR}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label className="text-sm font-semibold text-foreground">Duração Estimada</Label>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 flex-1">
                            <Input
                              type="number"
                              min={0}
                              placeholder="0"
                              disabled={isFormLocked}
                              value={Math.floor(form.durationMinutes / 60) || ""}
                              onChange={(e) => {
                                const h = parseInt(e.target.value) || 0
                                const m = form.durationMinutes % 60
                                setForm((p) => ({ ...p, durationMinutes: h * 60 + m }))
                              }}
                              className="w-full text-center"
                            />
                            <span className="text-sm text-muted-foreground shrink-0">h</span>
                          </div>
                          <div className="flex items-center gap-1 flex-1">
                            <Input
                              type="number"
                              min={0}
                              max={59}
                              placeholder="0"
                              disabled={isFormLocked}
                              value={form.durationMinutes % 60 || ""}
                              onChange={(e) => {
                                const m = Math.min(59, parseInt(e.target.value) || 0)
                                const h = Math.floor(form.durationMinutes / 60)
                                setForm((p) => ({ ...p, durationMinutes: h * 60 + m }))
                              }}
                              className="w-full text-center"
                            />
                            <span className="text-sm text-muted-foreground shrink-0">min</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedDate && !isFormLocked && (() => {
                    if (isHistoricDate) {
                      // ── Histórico: slots de 30 em 30 min ──────────────────
                      return (
                        <div className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-amber-800 dark:text-amber-200 uppercase tracking-wide">Agendamento histórico</span>
                            <span className="text-xs text-amber-700 dark:text-amber-300">· sem notificação</span>
                          </div>
                          <Label className="text-sm font-medium">Horário *</Label>
                          <div className="grid grid-cols-4 xs:grid-cols-6 sm:grid-cols-8 gap-1.5">
                            {Array.from({ length: 48 }, (_, i) => {
                              const h = Math.floor(i / 2)
                              const m = (i % 2) * 30
                              const d = new Date(selectedDate)
                              d.setHours(h, m, 0, 0)
                              const tzOffset = d.getTimezoneOffset() * 60000
                              const value = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16)
                              const label = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
                              const isSelected = form.scheduledDateTime
                                ? new Date(form.scheduledDateTime).getTime() === new Date(value).getTime()
                                : false
                              return (
                                <Button
                                  key={label}
                                  type="button"
                                  variant={isSelected ? "default" : "outline"}
                                  size="sm"
                                  className={cn(
                                    "h-9 px-1 text-[10px] sm:text-xs font-medium",
                                    isSelected
                                      ? "bg-amber-600 text-white border-amber-600"
                                      : "border-amber-300 text-amber-700 hover:bg-amber-100"
                                  )}
                                  onClick={() => setForm((p) => ({ ...p, scheduledDateTime: value }))}
                                >
                                  {label}
                                </Button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    }

                    const now = new Date()
                    const isToday = selectedDate.toDateString() === now.toDateString()
                    const visibleSlots = (availability ?? []).filter((slot: any) => {
                      if (!isToday) return true
                      // Always show the slot that is currently scheduled for this appointment
                      const isCurrentTime = form.scheduledDateTime && new Date(slot.startTime).getTime() === new Date(form.scheduledDateTime).getTime()
                      return new Date(slot.startTime) > now || isCurrentTime
                    })
                    return (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Horários Disponíveis</Label>
                          {!selectedDateClosed && form.employeeId !== "none" && form.employeeId && (
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                                Livre
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="inline-block h-2 w-2 rounded-full bg-orange-400" />
                                Ocupado
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
                                Bloqueado
                              </span>
                            </div>
                          )}
                        </div>
                        {selectedDateClosed ? (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/40 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                            Estabelecimento fechado neste dia. Ative o modo <strong>Encaixe</strong> para forçar um horário.
                          </div>
                        ) : loadingAvailability ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Carregando horários...
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                              {visibleSlots.map((slot: any) => {
                                const isSelected = form.scheduledDateTime && new Date(slot.startTime).getTime() === new Date(form.scheduledDateTime).getTime()
                                const hasSpecificEmployee = form.employeeId !== "none" && !!form.employeeId
                                const canSelect = isSelected || slot.isAvailable || (isEncaixe && !slot.isBlocked)
                                return (
                                  <Button
                                    key={slot.startTime}
                                    type="button"
                                    variant={isSelected ? "default" : "outline"}
                                    size="sm"
                                    className={cn(
                                      "h-9 px-1 text-[10px] sm:text-xs font-medium",
                                      !isSelected && slot.isAvailable && "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800",
                                      slot.isBlocked && "border-red-200 bg-red-50 text-red-400 opacity-60 cursor-not-allowed hover:bg-red-50 hover:text-red-400",
                                      !slot.isAvailable && !slot.isBlocked && !isEncaixe && (
                                        hasSpecificEmployee
                                          ? "border-orange-300 bg-orange-50 text-orange-500 opacity-70 cursor-not-allowed hover:bg-orange-50 hover:text-orange-500"
                                          : "border-muted bg-muted/40 text-muted-foreground opacity-50 cursor-not-allowed"
                                      ),
                                      !slot.isAvailable && !slot.isBlocked && isEncaixe && !isSelected && "border-amber-400 bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700",
                                    )}
                                    disabled={!canSelect}
                                    onClick={() => setForm((p) => ({ ...p, scheduledDateTime: slot.startTime }))}
                                    title={
                                      slot.isBlocked
                                        ? (slot.blockReason ? `Bloqueado: ${slot.blockReason}` : "Horário bloqueado")
                                        : !slot.isAvailable && hasSpecificEmployee
                                          ? "Funcionário ocupado neste horário"
                                          : undefined
                                    }
                                  >
                                    {format(new Date(slot.startTime), "HH:mm")}
                                  </Button>
                                )
                              })}
                            </div>
                            {visibleSlots.length === 0 && (
                              <p className="text-sm text-muted-foreground">Nenhum horário disponível para esta data.</p>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })()}

                  <div className="flex items-center gap-3 py-1">
                    <Switch id="encaixe-edit" checked={isEncaixe} onCheckedChange={setIsEncaixe} disabled={isFormLocked} />
                    <div>
                      <Label htmlFor="encaixe-edit" className="flex items-center gap-1.5 cursor-pointer">
                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                        Encaixe
                      </Label>
                      <p className="text-xs text-muted-foreground">Permite agendar em horários já ocupados</p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="amount">Valor (R$)</Label>
                      <CurrencyInput
                        id="amount"
                        value={form.amount}
                        onChange={(v) => setForm((p) => ({ ...p, amount: v }))}
                        disabled={isFormLocked}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="description">Descrição Curta</Label>
                      <Input
                        id="description"
                        placeholder={placeholders.name}
                        value={form.description}
                        onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                        disabled={isFormLocked}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea
                      id="notes"
                      placeholder="Observações adicionais..."
                      rows={3}
                      value={form.notes}
                      onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                      disabled={isFormLocked}
                    />
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                    <Button type="button" variant="outline" asChild className="w-full sm:w-auto h-11 text-sm sm:text-base">
                      <Link href="/appointments">Voltar</Link>
                    </Button>
                    <Button type="submit" disabled={isSaving || isFormLocked} className="w-full sm:w-auto h-11 text-sm sm:text-base">
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar Alterações
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Status do Agendamento</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {Object.entries(appointmentStatusConfig).map(([key, config]) => {
                  const StatusIcon = config.icon
                  const isActive = form.status === parseInt(key)
                  return (
                    <Button
                      key={key}
                      variant={isActive ? "default" : "outline"}
                      className={`justify-start ${isActive ? config.color + " border-none" : ""}`}
                      onClick={() => handleStatusClick(parseInt(key))}
                      disabled={isSaving}
                    >
                      <StatusIcon className="mr-2 h-4 w-4" />
                      {config.label}
                    </Button>
                  )
                })}
              </CardContent>
            </Card>

            {appointment?.clientMembershipId && (
              <Card className="bg-emerald-50 border-emerald-200">
                <CardContent className="p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-emerald-600" />
                    <h4 className="font-semibold text-sm text-emerald-700">Assinatura Utilizada</h4>
                  </div>
                  {appointment.membershipPlanName && (
                    <p className="text-xs text-emerald-700 font-medium">{appointment.membershipPlanName}</p>
                  )}
                  {appointment.membershipRemainingSessions !== null && appointment.membershipRemainingSessions !== undefined && (
                    <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 w-fit">
                      {appointment.membershipRemainingSessions} sessões restantes
                    </Badge>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="bg-primary/5 border-primary/10">
              <CardContent className="p-4 flex flex-col gap-3">
                <h4 className="font-semibold text-sm">Próximos Passos</h4>
                <p className="text-xs text-muted-foreground">
                  Ao concluir o atendimento, lembre-se de marcar como <strong>Concluído</strong> para manter seu histórico atualizado.
                </p>
              </CardContent>
            </Card>

            {!tenant?.useWhatsappBooking && !!appointment.clientPhone && appointment.status < 2 && (
              <Card className="border-emerald-200/60">
                <CardContent className="p-4 flex flex-col gap-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-emerald-600" />
                    Notificar via WhatsApp
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Envie uma mensagem diretamente para o WhatsApp do cliente.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => sendWhatsAppMessage(appointment, appointment.status, false)}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Abrir WhatsApp
                  </Button>
                </CardContent>
              </Card>
            )}

            {appointment.status === 2 && (
              <Card>
                <CardContent className="p-4 flex flex-col gap-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    Avaliação do Cliente
                  </h4>
                  {isFetchingRating ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verificando avaliação...
                    </div>
                  ) : existingRating ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`h-5 w-5 ${s <= existingRating.stars ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                        ))}
                      </div>
                      {existingRating.comment && (
                        <p className="text-xs text-muted-foreground italic">"{existingRating.comment}"</p>
                      )}
                      <span className="text-xs text-green-600 font-medium">Avaliação recebida</span>
                    </div>
                  ) : ratingRequestSent ? (
                    <p className="text-xs text-green-600 font-medium">Solicitação enviada com sucesso!</p>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Envie uma solicitação de avaliação para o cliente via WhatsApp.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSendRatingRequest}
                        disabled={isSendingRating}
                      >
                        {isSendingRating
                          ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          : <Send className="mr-2 h-4 w-4" />}
                        Solicitar Avaliação
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Dialog: confirmar envio de WhatsApp após reagendamento */}
      <AlertDialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Notificar Reagendamento
            </AlertDialogTitle>
            <AlertDialogDescription>
              A data ou horário do agendamento foi alterado. Deseja enviar uma mensagem para o WhatsApp do cliente informando sobre a mudança?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRescheduleDialogOpen(false)}>Agora não</AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                // Pass status 5 (Rescheduled) for the hook to generate the message
                sendWhatsAppMessage(appointment, 5, false);
                setRescheduleDialogOpen(false);
              }}
            >
              Enviar Mensagem
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: confirmar envio de WhatsApp após mudança de status */}
      <Dialog open={!!pendingWhatsApp} onOpenChange={(open) => !open && cancelWhatsApp()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-emerald-600" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              Enviar via WhatsApp?
            </DialogTitle>
            <p className="text-sm text-muted-foreground pt-1">
              Deseja enviar uma mensagem para <span className="font-semibold text-foreground">{pendingWhatsApp?.clientName}</span> sobre a atualização do agendamento?
            </p>
          </DialogHeader>
          {pendingWhatsApp?.message && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5 text-xs text-emerald-800 leading-relaxed">
              {pendingWhatsApp.message}
            </div>
          )}
          <DialogFooter className="flex-row gap-2 sm:flex-row">
            <Button variant="outline" className="flex-1" onClick={cancelWhatsApp}>
              Não
            </Button>
            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={confirmWhatsApp}>
              Enviar no WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: selecionar funcionário ao concluir agendamento sem profissional */}
      <Dialog open={employeeDialogOpen} onOpenChange={(o) => { if (!o) { setEmployeeDialogOpen(false); setPendingStatus(null) } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Quem realizou o serviço?
            </DialogTitle>
            <DialogDescription>
              Este agendamento não tem funcionário definido. Selecione quem atendeu o cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select value={selectedEmployeeForCompletion} onValueChange={setSelectedEmployeeForCompletion}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar funcionário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não informar</SelectItem>
                {employees?.map((emp: any) => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setEmployeeDialogOpen(false); setPendingStatus(null) }}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmEmployeeAndComplete} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthGuard>
  )
}
