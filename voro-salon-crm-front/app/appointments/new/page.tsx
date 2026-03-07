"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Calendar as CalendarIcon, User, Scissors } from "lucide-react"
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
import { toast } from "sonner"
import useSWR from "swr"

import { API_CONFIG, secureApiCall } from "@/lib/api"
import { AuthGuard } from "@/components/auth/auth.guard"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { QuickCreateClient } from "@/components/custom/quick-create-client"
import { QuickCreateService } from "@/components/custom/quick-create-service"
import { QuickCreateEmployee } from "@/components/custom/quick-create-employee"

const fetcher = async (url: string) => {
  const result = await secureApiCall<any>(url, { method: "GET" })
  if (result.hasError) throw new Error(result.message || "Error")
  return result.data
}

export default function NovoAgendamentoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Fetch data for dropdowns
  const { data: clients, mutate: mutateClients } = useSWR(API_CONFIG.ENDPOINTS.CLIENTS, fetcher)
  const { data: services, mutate: mutateServices } = useSWR(API_CONFIG.ENDPOINTS.SERVICES, fetcher)
  const { data: modules } = useSWR(API_CONFIG.ENDPOINTS.TENANT_MODULES, fetcher)

  const isModuleEnabled = (moduleId: number) => {
    return modules?.find((m: any) => m.module === moduleId)?.isEnabled ?? true
  }

  const [form, setForm] = useState({
    clientId: "",
    serviceId: "none",
    employeeId: "none",
    scheduledDateTime: "",
    durationMinutes: 30,
    description: "",
    amount: 0,
    notes: ""
  })

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

  // Fetch employees based on service
  const { data: employees, mutate: mutateEmployees } = useSWR(
    form.serviceId !== "none"
      ? `${API_CONFIG.ENDPOINTS.EMPLOYEES}/available-for-service/${form.serviceId}`
      : API_CONFIG.ENDPOINTS.EMPLOYEES,
    fetcher
  )

  // Fetch available slots
  const { data: availability, isLoading: loadingAvailability } = useSWR(
    selectedDate
      ? `${API_CONFIG.ENDPOINTS.APPOINTMENTS_AVAILABILITY}?date=${selectedDate.toISOString()}${form.employeeId !== "none" ? `&employeeId=${form.employeeId}` : ""}`
      : null,
    fetcher
  )

  // Set default date/time to now (rounded to next 30 min)
  useEffect(() => {
    const now = new Date()
    now.setMinutes(Math.ceil(now.getMinutes() / 30) * 30)
    now.setSeconds(0)
    now.setMilliseconds(0)

    // Set selected date
    setSelectedDate(now)

    // Format for datetime-local input (YYYY-MM-DDTHH:mm) - still keeping for compatibility or fallback
    const tzOffset = now.getTimezoneOffset() * 60000
    const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16)

    setForm(p => ({ ...p, scheduledDateTime: localISOTime }))
  }, [])

  // Update amount when service changes
  function handleServiceChange(serviceId: string) {
    const selectedService = services?.find((s: any) => s.id === serviceId)
    setForm(p => ({
      ...p,
      serviceId,
      amount: selectedService?.price ?? p.amount,
      description: p.description || selectedService?.name || ""
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.clientId) {
      toast.error("Selecione um cliente.")
      return
    }
    if (!form.scheduledDateTime) {
      toast.error("Selecione a data e hora.")
      return
    }

    setLoading(true)
    try {
      // Convert local time string to ISO with offset properly handled by API
      const date = new Date(form.scheduledDateTime)

      const res = await secureApiCall(API_CONFIG.ENDPOINTS.APPOINTMENTS, {
        method: "POST",
        body: JSON.stringify({
          ...form,
          scheduledDateTime: date.toISOString(),
          serviceId: form.serviceId === "none" ? null : form.serviceId,
          employeeId: form.employeeId === "none" ? null : form.employeeId
        }),
      })

      if (res.hasError) {
        toast.error(res.message || "Erro ao criar agendamento.")
        return
      }

      toast.success("Agendamento criado com sucesso!")
      router.push("/appointments")
      router.refresh()
    } catch {
      toast.error("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthGuard requiredRoles={["User"]}>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/appointments">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Novo Agendamento</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Informações do Agendamento</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="clientId">Cliente *</Label>
                    <QuickCreateClient
                      onSuccess={async (id) => {
                        await mutateClients()
                        setForm(p => ({ ...p, clientId: id }))
                      }}
                    />
                  </div>
                  <Select
                    key={clients ? "clients-loaded" : "clients-loading"}
                    value={form.clientId}
                    onValueChange={(v) => setForm(p => ({ ...p, clientId: v }))}
                  >
                    <SelectTrigger id="clientId" className="w-full">
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isModuleEnabled(3) && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="serviceId">Serviço (Opcional)</Label>
                      <QuickCreateService
                        onSuccess={async (id) => {
                          await mutateServices()
                          setForm(p => ({ ...p, serviceId: id }))
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
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
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
                          setForm(p => ({ ...p, employeeId: id }))
                        }}
                      />
                    </div>
                    <Select
                      key={employees ? "employees-loaded" : "employees-loading"}
                      value={form.employeeId}
                      onValueChange={(v) => setForm(p => ({ ...p, employeeId: v }))}
                    >
                      <SelectTrigger id="employeeId" className="w-full">
                        <SelectValue placeholder="Selecione um funcionário" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Qualquer um</SelectItem>
                        {employees?.map((e: any) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.name}
                          </SelectItem>
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
                        variant={"outline"}
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
                          setForm(p => ({ ...p, scheduledDateTime: "" })) // Reset slot selection
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
                    onValueChange={(v) => setForm(p => ({ ...p, durationMinutes: parseInt(v) }))}
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

              {selectedDate && (
                <div className="mt-2 flex flex-col gap-2">
                  <Label className="text-sm font-medium">Horários Disponíveis</Label>
                  {loadingAvailability ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando horários...
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
                      {availability?.map((slot: any) => (
                        <Button
                          key={slot.startTime}
                          type="button"
                          variant={form.scheduledDateTime === slot.startTime ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "h-9 px-2 text-xs",
                            !slot.isAvailable && "opacity-30 cursor-not-allowed bg-muted"
                          )}
                          disabled={!slot.isAvailable}
                          onClick={() => setForm(p => ({ ...p, scheduledDateTime: slot.startTime }))}
                        >
                          {format(new Date(slot.startTime), "HH:mm")}
                        </Button>
                      ))}
                    </div>
                  )}
                  {availability?.length === 0 && !loadingAvailability && (
                    <p className="text-sm text-muted-foreground">Nenhum horário disponível para esta data.</p>
                  )}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="amount">Valor (R$)</Label>
                  <CurrencyInput
                    id="amount"
                    value={form.amount}
                    onChange={(v) => setForm(p => ({ ...p, amount: v }))}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="description">Descrição Curta</Label>
                  <Input
                    id="description"
                    placeholder="Ex: Corte e Barba"
                    value={form.description}
                    onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
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
                  onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirmar Agendamento
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/appointments">Cancelar</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AuthGuard >
  )
}
