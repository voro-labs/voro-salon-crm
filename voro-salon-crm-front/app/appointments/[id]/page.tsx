"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Trash2, Calendar, Clock, User, Scissors, CheckCircle2, Circle, XCircle, AlertCircle } from "lucide-react"
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
import { CurrencyInput } from "@/components/currency-input"
import { toast } from "sonner"
import useSWR, { mutate } from "swr"

import { API_CONFIG, secureApiCall } from "@/lib/api"
import { AuthGuard } from "@/components/auth/auth.guard"

const fetcher = async (url: string) => {
  const result = await secureApiCall<any>(url, { method: "GET" })
  if (result.hasError) throw new Error(result.message || "Error")
  return result.data
}

const statusConfig: Record<number, { label: string; color: string; icon: any }> = {
  0: { label: "Pendente", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Circle },
  1: { label: "Confirmado", color: "bg-blue-100 text-blue-800 border-blue-200", icon: Calendar },
  2: { label: "Concluído", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
  3: { label: "Cancelado", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
  4: { label: "Faltou", color: "bg-gray-100 text-gray-800 border-gray-200", icon: AlertCircle },
}

export default function AppointmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const appointmentId = params.id as string

  const { data: appointment, isLoading: loadingApt } = useSWR(
    appointmentId ? `${API_CONFIG.ENDPOINTS.APPOINTMENTS}/${appointmentId}` : null,
    fetcher
  )

  const { data: clients, isLoading: loadingClients } = useSWR(API_CONFIG.ENDPOINTS.CLIENTS, fetcher)
  const { data: services, isLoading: loadingServices } = useSWR(API_CONFIG.ENDPOINTS.SERVICES, fetcher)
  const { data: tenant } = useSWR(API_CONFIG.ENDPOINTS.TENANT_ME, fetcher)
  const { data: modules } = useSWR(API_CONFIG.ENDPOINTS.TENANT_MODULES, fetcher)

  const isModuleEnabled = (moduleId: number) => {
    return modules?.find((m: any) => m.module === moduleId)?.isEnabled ?? true
  }

  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({
    clientId: "",
    serviceId: "",
    employeeId: "none",
    scheduledDateTime: "",
    durationMinutes: 30,
    status: 0,
    description: "",
    amount: 0,
    notes: ""
  })

  useEffect(() => {
    if (appointment) {
      const date = new Date(appointment.scheduledDateTime)
      const tzOffset = date.getTimezoneOffset() * 60000
      const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)

      setForm({
        clientId: appointment.clientId,
        serviceId: appointment.serviceId || "none",
        employeeId: appointment.employeeId || "none",
        scheduledDateTime: localISOTime,
        durationMinutes: appointment.durationMinutes,
        status: appointment.status,
        description: appointment.description || "",
        amount: appointment.amount || 0,
        notes: appointment.notes || ""
      })
    }
  }, [appointment])

  // Fetch employees based on service
  const { data: employees } = useSWR(
    form.serviceId !== "none" && form.serviceId !== ""
      ? `${API_CONFIG.ENDPOINTS.EMPLOYEES}/available-for-service/${form.serviceId}`
      : API_CONFIG.ENDPOINTS.EMPLOYEES,
    fetcher
  )

  // Update amount when service changes
  function handleServiceChange(serviceId: string) {
    const selectedService = services?.find((s: any) => s.id === serviceId)
    setForm(p => ({
      ...p,
      serviceId,
      amount: selectedService?.price ?? p.amount,
      description: p.description || selectedService?.name || (serviceId === "none" ? "" : p.description)
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const date = new Date(form.scheduledDateTime)
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.APPOINTMENTS}/${appointmentId}`, {
        method: "PUT",
        body: JSON.stringify({
          ...form,
          scheduledDateTime: date.toISOString(),
          serviceId: form.serviceId === "none" ? null : form.serviceId,
          employeeId: form.employeeId === "none" ? null : form.employeeId
        }),
      })
      if (res.hasError) {
        toast.error(res.message || "Erro ao atualizar agendamento.")
        return
      }
      toast.success("Agendamento atualizado com sucesso!")
      mutate(`${API_CONFIG.ENDPOINTS.APPOINTMENTS}/${appointmentId}`)
      router.push("/appointments")
    } catch {
      toast.error("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleWhatsApp = (apt: any, newStatus: number) => {
    const supportedStatuses = [0, 1, 2, 3, 4]
    if (!supportedStatuses.includes(newStatus)) return

    if (tenant?.useWhatsappBooking) {
      return
    }

    const clientPhone = apt.clientPhone || apt.client?.phone

    if (!clientPhone) {
      toast.warning("Cliente sem telefone cadastrado — não foi possível abrir o WhatsApp.")
      return
    }
    const phone = clientPhone.replace(/\D/g, "")
    const date = new Date(apt.scheduledDateTime)
    const dateStr = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    const timeStr = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    const serviceName = apt.serviceName || apt.service?.name || "serviço"
    const clientName = apt.clientName || apt.client?.name || "Cliente"
    
    let message = ""
    switch (newStatus) {
      case 0: // Pending
        message = `Olá ${clientName}! Recebemos sua solicitação de agendamento para ${serviceName} em ${dateStr} às ${timeStr}. Estamos analisando e logo te confirmamos! ⏳`
        break
      case 1: // Confirmed
        message = `Olá ${clientName}! Seu agendamento de ${serviceName} foi confirmado para ${dateStr} às ${timeStr}. Aguardamos você! 😊`
        break
      case 2: // Completed
        message = `Olá ${clientName}! Obrigado pelo seu agendamento de ${serviceName}. Foi um prazer atendê-lo(a)! Qualquer dúvida, estamos à disposição. 🙏`
        break
      case 3: // Cancelled
        message = `Olá ${clientName}! Infelizmente seu agendamento de ${serviceName} para ${dateStr} às ${timeStr} precisou ser cancelado. Se desejar, podemos reagendar para outro horário! 😊`
        break
      case 4: // NoShow
        message = `Olá ${clientName}, sentimos sua falta hoje no agendamento de ${serviceName}. Aconteceu algum imprevisto? Se quiser agendar uma nova data, estamos por aqui! 👋`
        break
      default:
        return
    }
    
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    window.open(url, "_blank")
    toast.info("WhatsApp aberto com mensagem pré-preenchida.")
  }

  async function handleStatusUpdate(newStatus: number) {
    setLoading(true)
    try {
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.APPOINTMENTS}/${appointmentId}/status`, {
        method: "PATCH",
        body: JSON.stringify(newStatus)
      })
      if (res.hasError) {
        toast.error(res.message || "Erro ao atualizar status.")
        return
      }
      toast.success(`Status atualizado para ${statusConfig[newStatus].label}`)
      mutate(`${API_CONFIG.ENDPOINTS.APPOINTMENTS}/${appointmentId}`)
      if (appointment) handleWhatsApp(appointment, newStatus)
    } catch {
      toast.error("Erro ao atualizar status.")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.APPOINTMENTS}/${appointmentId}`, {
        method: "DELETE",
      })
      if (res.hasError) {
        toast.error(res.message || "Erro ao excluir agendamento.")
        return
      }
      toast.success("Agendamento excluído com sucesso!")
      router.push("/appointments")
    } catch {
      toast.error("Erro de conexão.")
    } finally {
      setDeleting(false)
    }
  }

  if (loadingApt || loadingClients || loadingServices || !appointment || !clients || !services) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <Card><CardContent className="h-64 animate-pulse rounded bg-muted/20" /></Card>
      </div>
    )
  }

  return (
    <AuthGuard requiredRoles={["User"]}>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/appointments">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight text-foreground truncate max-w-[200px] sm:max-w-md">
              Agendamento: {appointment?.clientName}
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
                <AlertDialogTitle>Excluir agendamento?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. O agendamento será removido permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Editar Registros</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="clientId">Cliente *</Label>
                      <Select
                        key={`client-${form.clientId}`}
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
                        <Label htmlFor="serviceId">Serviço (Opcional)</Label>
                        <Select
                          key={`service-${form.serviceId}`}
                          value={form.serviceId}
                          onValueChange={handleServiceChange}
                        >
                          <SelectTrigger id="serviceId" className="w-full">
                            <SelectValue placeholder="Selecione um serviço" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhum</SelectItem>
                            {services?.map((s: any) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {isModuleEnabled(4) && (
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="employeeId">Funcionário (Opcional)</Label>
                        <Select
                          key={`employee-${form.employeeId}`}
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

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="scheduledDateTime">Data e Hora *</Label>
                      <Input
                        id="scheduledDateTime"
                        type="datetime-local"
                        value={form.scheduledDateTime}
                        onChange={(e) => setForm(p => ({ ...p, scheduledDateTime: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="durationMinutes">Duração (minutos)</Label>
                      <Select
                        key={`duration-${form.durationMinutes}`}
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
                      placeholder="Observações adicionais..."
                      rows={3}
                      value={form.notes}
                      onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button type="submit" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar Alterações
                    </Button>
                    <Button type="button" variant="outline" asChild>
                      <Link href="/appointments">Cancelar</Link>
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
                {Object.entries(statusConfig).map(([key, config]) => {
                  const StatusIcon = config.icon
                  const isActive = form.status === parseInt(key)

                  return (
                    <Button
                      key={key}
                      variant={isActive ? "default" : "outline"}
                      className={`justify-start ${isActive ? config.color + " border-none" : ""}`}
                      onClick={() => handleStatusUpdate(parseInt(key))}
                      disabled={loading}
                    >
                      <StatusIcon className="mr-2 h-4 w-4" />
                      {config.label}
                    </Button>
                  )
                })}
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/10">
              <CardContent className="p-4 flex flex-col gap-3">
                <h4 className="font-semibold text-sm">Próximos Passos</h4>
                <p className="text-xs text-muted-foreground">
                  Ao concluir o atendimento, lembre-se de marcar como <strong>Concluído</strong> para manter seu histórico atualizado.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
