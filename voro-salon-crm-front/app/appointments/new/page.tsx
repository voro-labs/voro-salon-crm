"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, Calendar as CalendarIcon, Zap } from "lucide-react"
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
import { QuickCreateClient } from "@/components/custom/quick-create-client"
import { QuickCreateService } from "@/components/custom/quick-create-service"
import { QuickCreateEmployee } from "@/components/custom/quick-create-employee"
import useSWR from "swr"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import { useAppointmentForm } from "@/hooks/use-appointment-form.hook"
import { Switch } from "@/components/ui/switch"

const fetcher = async (url: string) => {
  const result = await secureApiCall<any>(url, { method: "GET" })
  if (result.hasError) throw new Error(result.message || "Error")
  return result.data
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
    handleServiceChange,
    createAppointment,
    mutateClients,
    mutateServices,
    mutateEmployees,
  } = useAppointmentForm()

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [isEncaixe, setIsEncaixe] = useState(false)

  const { data: availability, isLoading: loadingAvailability } = useSWR(
    selectedDate
      ? `${API_CONFIG.ENDPOINTS.APPOINTMENTS_AVAILABILITY}?date=${format(selectedDate, "yyyy-MM-dd")}${form.employeeId !== "none" ? `&employeeId=${form.employeeId}` : ""}`
      : null,
    fetcher
  )

  // Set default date/time to now (rounded to next 30 min)
  useEffect(() => {
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
              onSubmit={(e) => { e.preventDefault(); createAppointment({ ...form, isEncaixe } as any) }}
              className="flex flex-col gap-5"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="clientId">Cliente *</Label>
                    <QuickCreateClient
                      onSuccess={async (id) => {
                        await mutateClients()
                        setForm((p) => ({ ...p, clientId: id }))
                      }}
                    />
                  </div>
                  <Select
                    key={clients ? "clients-loaded" : "clients-loading"}
                    value={form.clientId}
                    onValueChange={(v) => setForm((p) => ({ ...p, clientId: v }))}
                  >
                    <SelectTrigger id="clientId" className="w-full">
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isModuleEnabled(3) && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="serviceId">Serviço (Opcional)</Label>
                      <QuickCreateService
                        onSuccess={async (id, serviceData) => {
                          await mutateServices()
                          handleServiceChange(id, serviceData)
                        }}
                      />
                    </div>
                    <Select
                      key={services ? "services-loaded" : "services-loading"}
                      value={form.serviceId}
                      onValueChange={handleServiceChange}
                    >
                      <SelectTrigger id="serviceId" className="w-full">
                        <SelectValue placeholder="Selecione um serviço" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum / Customizado</SelectItem>
                        {services?.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {isModuleEnabled(4) && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="employeeId">Funcionário (Opcional)</Label>
                      <QuickCreateEmployee
                        onSuccess={async (id) => {
                          await mutateEmployees()
                          setForm((p) => ({ ...p, employeeId: id }))
                        }}
                      />
                    </div>
                    <Select
                      key={employees ? "employees-loaded" : "employees-loading"}
                      value={form.employeeId}
                      onValueChange={(v) => setForm((p) => ({ ...p, employeeId: v }))}
                    >
                      <SelectTrigger id="employeeId" className="w-full">
                        <SelectValue placeholder="Selecione um funcionário" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Qualquer um</SelectItem>
                        {employees?.map((e: any) => (
                          <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label>Data e Horário Disponível *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
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
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)
                          return date < today
                        }}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
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
              </div>

              {selectedDate && (() => {
                const now = new Date()
                const isToday = selectedDate.toDateString() === now.toDateString()
                const visibleSlots = (availability ?? []).filter((slot: any) => {
                  if (!isToday) return true
                  return new Date(slot.startTime) > now
                })
                return (
                  <div className="mt-2 flex flex-col gap-2">
                    <Label className="text-sm font-medium">Horários Disponíveis</Label>
                    {loadingAvailability ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando horários...
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                        {visibleSlots.map((slot: any) => {
                          const isSelected = form.scheduledDateTime === slot.startTime
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
                    )}
                    {visibleSlots.length === 0 && !loadingAvailability && (
                      <p className="text-sm text-muted-foreground">Nenhum horário disponível para esta data.</p>
                    )}
                  </div>
                )
              })()}

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
                    placeholder="Ex: Corte e Barba"
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

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <Button type="button" variant="outline" asChild className="w-full sm:w-auto h-11 text-sm sm:text-base">
                  <Link href="/appointments">Cancelar</Link>
                </Button>
                <Button type="submit" disabled={isCreating} className="w-full sm:w-auto h-11 text-sm sm:text-base">
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirmar Agendamento
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  )
}
