"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Calendar as CalendarIcon, Zap, Tag } from "lucide-react"
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
import { CurrencyInput } from "@/components/currency-input"
import { AuthGuard } from "@/components/auth/auth.guard"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { formatDuration } from "@/lib/format-utils"
import { QuickCreateClient } from "@/components/custom/quick-create-client"
import { QuickCreateService } from "@/components/custom/quick-create-service"
import { QuickCreateEmployee } from "@/components/custom/quick-create-employee"
import { SearchableSelect } from "@/components/ui/custom/searchable-select"
import useSWR from "swr"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import { useAppointmentForm } from "@/hooks/use-appointment-form.hook"
import { useSettings } from "@/hooks/use-settings.hook"
import { useAuth } from "@/contexts/auth.context"
import { getServicePlaceholders } from "@/lib/branding"
import { EstablishmentType } from "@/types/Enums/establishmentType.enum"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"

const fetcher = async (url: string) => {
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

export default function NovoAgendamentoPage() {
  const {
    clients,
    services,
    employees,
    form,
    setForm,
    isCreating,
    isModuleEnabled,
    createAppointment,
    mutateClients,
    mutateServices,
    mutateEmployees,
    activeMembership,
  } = useAppointmentForm()

  const { tenant } = useSettings()
  const placeholders = getServicePlaceholders(tenant?.establishmentType ?? EstablishmentType.Salon)
  const { user } = useAuth()
  const isSalonEmployee = user?.roles?.some((r: any) => r.name === "SalonEmployee") ?? false

  const searchParams = useSearchParams()

  // Pre-fill date/time from calendar slot click or audio transcription
  useEffect(() => {
    const dateParam = searchParams.get("date")
    const hourParam = searchParams.get("hour")
    const descriptionParam = searchParams.get("description")
    const amountParam = searchParams.get("amount")
    const durationParam = searchParams.get("durationMinutes")
    const clientIdParam = searchParams.get("clientId")
    const serviceIdParam = searchParams.get("serviceId")

    const updates: Partial<typeof form> = {}

    if (dateParam) {
      if (hourParam) {
        // Data + horário: pre-fill completo (scheduledDateTime)
        const hour = parseInt(hourParam, 10)
        const minute = parseInt(searchParams.get("minute") ?? "0", 10)
        const dateObj = new Date(`${dateParam}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`)
        if (!isNaN(dateObj.getTime())) {
          setSelectedDate(dateObj)
          const tzOffset = dateObj.getTimezoneOffset() * 60000
          updates.scheduledDateTime = new Date(dateObj.getTime() - tzOffset).toISOString().slice(0, 16)
        }
      } else {
        // Só data (sem horário): pre-fill apenas o calendário
        const dateObj = new Date(`${dateParam}T12:00:00`)
        if (!isNaN(dateObj.getTime())) {
          setSelectedDate(dateObj)
        }
      }
    }

    if (descriptionParam) updates.description = descriptionParam
    if (amountParam) updates.amount = parseFloat(amountParam)
    if (durationParam) updates.durationMinutes = parseInt(durationParam, 10)
    if (clientIdParam) updates.clientId = clientIdParam
    if (serviceIdParam) updates.serviceIds = [serviceIdParam]

    if (Object.keys(updates).length > 0) setForm((p) => ({ ...p, ...updates }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pre-fill client by name from audio transcription (match when clients load)
  useEffect(() => {
    const clientNameParam = searchParams.get("clientName")
    if (!clientNameParam || !clients?.length || form.clientId) return
    const lower = clientNameParam.toLowerCase()
    const match = clients.find((c: any) =>
      (c.name ?? c.clientName ?? "").toLowerCase().includes(lower)
    )
    if (match) {
      setForm((p) => ({ ...p, clientId: match.id }))
    } else {
      setQuickClientName(clientNameParam)
      setQuickClientOpen(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients])

  const { data: myEmployee } = useSWR<any>(
    isSalonEmployee ? API_CONFIG.ENDPOINTS.EMPLOYEE_ME : null,
    fetcher
  )

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [isEncaixe, setIsEncaixe] = useState(false)
  const [selectedServices, setSelectedServices] = useState<SelectedServiceItem[]>([])
  const [quickClientOpen, setQuickClientOpen] = useState(false)
  const [quickClientName, setQuickClientName] = useState("")

  const isHistoricDate = selectedDate
    ? selectedDate < new Date(new Date().setHours(0, 0, 0, 0))
    : false

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

  const { data: businessHours } = useSWR<any[]>(API_CONFIG.ENDPOINTS.BUSINESS_HOURS, fetcher)

  function isDateClosed(date: Date): boolean {
    if (!businessHours || businessHours.length === 0) return false
    const dow = date.getDay()
    const dayHours = businessHours.find((h: any) => h.dayOfWeek === dow)
    if (!dayHours) return true
    return !dayHours.isOpen
  }

  const selectedDateClosed = selectedDate ? isDateClosed(selectedDate) : false

  // Quando data histórica, forçar status Concluído por padrão
  useEffect(() => {
    if (isHistoricDate && form.status !== 2 && form.status !== 3) {
      setForm((p) => ({ ...p, status: 2 }))
    } else if (!isHistoricDate && (form.status === 2 || form.status === 3)) {
      setForm((p) => ({ ...p, status: 0 }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHistoricDate])

  const { data: availability, isLoading: loadingAvailability } = useSWR(
    selectedDate && !selectedDateClosed
      ? `${API_CONFIG.ENDPOINTS.APPOINTMENTS_AVAILABILITY}?date=${format(selectedDate, "yyyy-MM-dd")}${form.employeeId !== "none" ? `&employeeId=${form.employeeId}` : ""}`
      : null,
    fetcher
  )

  // Clear scheduledDateTime when availability loads with no future slots
  useEffect(() => {
    if (loadingAvailability || !availability || !selectedDate) return
    const now = new Date()
    const isToday = selectedDate.toDateString() === now.toDateString()
    const hasVisible = (availability as any[]).some((slot) =>
      isToday ? new Date(slot.startTime) > now : true
    )
    if (!hasVisible) {
      setForm((p) => ({ ...p, scheduledDateTime: "" }))
    }
  }, [availability, loadingAvailability, selectedDate])

  // Auto-set employee for SalonEmployee role
  useEffect(() => {
    if (myEmployee?.id) {
      setForm((p) => ({ ...p, employeeId: myEmployee.id }))
    }
  }, [myEmployee?.id])

  // Set default date/time to now (rounded to next 30 min) — skip when URL params pre-fill
  useEffect(() => {
    if (searchParams.get("date")) return
    const now = new Date()
    now.setMinutes(Math.ceil(now.getMinutes() / 30) * 30)
    now.setSeconds(0)
    now.setMilliseconds(0)
    setSelectedDate(now)
    const tzOffset = now.getTimezoneOffset() * 60000
    const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16)
    setForm((p) => ({ ...p, scheduledDateTime: localISOTime }))
  }, [setForm])

  return (
    <AuthGuard requiredRoles={["SalonOwner", "SalonEmployee", "Owner"]}>
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/appointments">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground text-balance truncate">Novo Agendamento</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Informações do Agendamento</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => { e.preventDefault(); createAppointment({ ...form, isEncaixe: isHistoricDate ? true : isEncaixe } as any) }}
              className="flex flex-col gap-5"
            >
              <div className="flex flex-col gap-5">
                {/* Cliente */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="clientId" className="text-sm font-semibold text-foreground">Cliente *</Label>
                    {!isSalonEmployee && (
                      <QuickCreateClient
                        onSuccess={async (id) => {
                          await mutateClients()
                          setForm((p) => ({ ...p, clientId: id }))
                          setQuickClientOpen(false)
                          setQuickClientName("")
                        }}
                        initialName={quickClientName}
                        externalOpen={quickClientOpen}
                        onExternalOpenChange={setQuickClientOpen}
                      />
                    )}
                  </div>
                  <SearchableSelect
                    id="clientId"
                    value={form.clientId}
                    onValueChange={(v) => setForm((p) => ({ ...p, clientId: v }))}
                    options={clients?.map((c: any) => ({ value: c.id, label: c.name })) ?? []}
                    placeholder="Selecione um cliente"
                    searchPlaceholder="Buscar cliente..."
                    emptyText="Nenhum cliente encontrado."
                  />
                  {activeMembership && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">
                        Usa assinatura: {activeMembership.planName}
                        {activeMembership.remainingSessions !== null && (
                          <span className="ml-1">· {activeMembership.remainingSessions} sessões restantes</span>
                        )}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Serviços */}
                {isModuleEnabled(3) && (
                  <div className="flex flex-col gap-2 border-t border-border/50 pt-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold text-foreground">Serviços <span className="text-muted-foreground font-normal">(Opcional)</span></Label>
                      {!isSalonEmployee && (
                        <QuickCreateService
                          onSuccess={async (id, serviceData) => {
                            await mutateServices()
                            toggleService({ id, ...serviceData })
                          }}
                        />
                      )}
                    </div>
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

                {/* Funcionário */}
                {isModuleEnabled(4) && !isSalonEmployee && (
                  <div className="flex flex-col gap-2 border-t border-border/50 pt-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="employeeId" className="text-sm font-semibold text-foreground">Funcionário <span className="text-muted-foreground font-normal">(Opcional)</span></Label>
                      <QuickCreateEmployee
                        onSuccess={async (id) => {
                          await mutateEmployees()
                          setForm((p) => ({ ...p, employeeId: id }))
                        }}
                      />
                    </div>
                    <SearchableSelect
                      id="employeeId"
                      value={form.employeeId}
                      onValueChange={(v) => setForm((p) => ({ ...p, employeeId: v }))}
                      options={[{ value: "none", label: "Qualquer um" }, ...(employees?.map((e: any) => ({ value: e.id, label: e.name })) ?? [])]}
                      placeholder="Selecione um funcionário"
                      searchPlaceholder="Buscar funcionário..."
                      emptyText="Nenhum funcionário encontrado."
                    />
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label>
                    {isHistoricDate ? "Data (Histórico)" : "Data e Horário Disponível *"}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground",
                          isHistoricDate && "border-amber-400 text-amber-800"
                        )}
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
                        disabled={(date) => {
                          // permitir datas passadas (histórico) — apenas bloqueia dias sem expediente
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)
                          if (date > today) return isDateClosed(date)
                          return false
                        }}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Duração Estimada</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 flex-1">
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
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

              {selectedDate && (isHistoricDate ? (
                // ── Histórico: slots de 30 em 30 min ──────────────────────
                <div className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-amber-800 dark:text-amber-200 uppercase tracking-wide">Agendamento histórico</span>
                    <span className="text-xs text-amber-700 dark:text-amber-300">· sem notificação</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
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
                        const isSelected = form.scheduledDateTime === value
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
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm font-medium">Status *</Label>
                    <div className="flex gap-2">
                      {([2, 3] as const).map((s) => {
                        const labels: Record<number, string> = { 2: "Concluído", 3: "Cancelado" }
                        const colors: Record<number, string> = {
                          2: form.status === s ? "bg-emerald-600 text-white border-emerald-600" : "border-emerald-400 text-emerald-700 hover:bg-emerald-50",
                          3: form.status === s ? "bg-red-500 text-white border-red-500" : "border-red-400 text-red-700 hover:bg-red-50",
                        }
                        return (
                          <Button
                            key={s}
                            type="button"
                            variant="outline"
                            size="sm"
                            className={cn("h-9 px-4 text-sm font-medium", colors[s])}
                            onClick={() => setForm((p) => ({ ...p, status: s }))}
                          >
                            {labels[s]}
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : (() => {
                const now = new Date()
                const isToday = selectedDate.toDateString() === now.toDateString()
                const visibleSlots = (availability ?? []).filter((slot: any) => {
                  if (!isToday) return true
                  return new Date(slot.startTime) > now
                })
                return (
                  <div className="mt-2 flex flex-col gap-2">
                    <Label className="text-sm font-medium">Horários Disponíveis</Label>
                    {selectedDateClosed ? (
                      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                        Estabelecimento fechado neste dia.
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
                            const formTime = form.scheduledDateTime ? new Date(form.scheduledDateTime).getTime() : NaN
                            const isSelected = !isNaN(formTime) && new Date(slot.startTime).getTime() === formTime
                            const canSelect = slot.isAvailable || (isEncaixe && !slot.isBlocked)
                            return (
                              <Button
                                key={slot.startTime}
                                type="button"
                                variant={isSelected ? "default" : "outline"}
                                size="sm"
                                className={cn(
                                  "h-9 px-1 text-[10px] sm:text-xs relative",
                                  slot.isBlocked && "opacity-30 cursor-not-allowed bg-muted",
                                  !slot.isAvailable && !slot.isBlocked && !isEncaixe && "opacity-30 cursor-not-allowed bg-muted",
                                  !slot.isAvailable && !slot.isBlocked && isEncaixe && !isSelected && "border-amber-400 text-amber-600",
                                )}
                                disabled={!canSelect}
                                onClick={() => setForm((p) => ({ ...p, scheduledDateTime: slot.startTime }))}
                                title={slot.isBlocked ? (slot.blockReason ? `Bloqueado: ${slot.blockReason}` : "Horário bloqueado") : undefined}
                              >
                                {format(new Date(slot.startTime), "HH:mm")}
                              </Button>
                            )
                          })}
                        </div>
                        {visibleSlots.length === 0 && (
                          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                            Nenhum horário disponível para esta data. Selecione outro dia ou ative o modo <strong>Encaixe</strong> abaixo.
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })())}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="amount">Valor (R$) *</Label>
                  <CurrencyInput
                    id="amount"
                    value={form.amount}
                    onChange={(v) => setForm((p) => ({ ...p, amount: v }))}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="description">Descrição Curta *</Label>
                  <Input
                    id="description"
                    placeholder={placeholders.name}
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  placeholder="Observações adicionais sobre o agendamento..."
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>

              {!isHistoricDate && (
                <div className="flex items-center gap-3 py-1">
                  <Switch
                    id="encaixe"
                    checked={isEncaixe}
                    onCheckedChange={setIsEncaixe}
                  />
                  <div>
                    <Label htmlFor="encaixe" className="flex items-center gap-1.5 cursor-pointer">
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                      Encaixe
                    </Label>
                    <p className="text-xs text-muted-foreground">Permite agendar em horários já ocupados</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <Button type="button" variant="outline" asChild className="w-full sm:w-auto h-11 text-sm sm:text-base">
                  <Link href="/appointments">Cancelar</Link>
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating || !form.scheduledDateTime}
                  title={!form.scheduledDateTime ? "Selecione um horário" : undefined}
                  className="w-full sm:w-auto h-11 text-sm sm:text-base"
                >
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isHistoricDate ? "Salvar no Histórico" : "Confirmar Agendamento"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  )
}
