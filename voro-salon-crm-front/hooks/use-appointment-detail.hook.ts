import { useState, useEffect } from "react"
import useSWR, { mutate } from "swr"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import { useWhatsApp } from "@/hooks/use-whatsapp.hook"
import { fetcher } from "@/lib/fetcher"

export interface AppointmentForm {
  clientId: string
  serviceId: string
  employeeId: string
  scheduledDateTime: string
  durationMinutes: number
  status: number
  description: string
  amount: number
  notes: string
}

const DEFAULT_FORM: AppointmentForm = {
  clientId: "",
  serviceId: "none",
  employeeId: "none",
  scheduledDateTime: "",
  durationMinutes: 30,
  status: 0,
  description: "",
  amount: 0,
  notes: "",
}

export function useAppointmentDetail(appointmentId: string) {
  const router = useRouter()
  const { sendWhatsAppMessage } = useWhatsApp()

  const { data: appointment, isLoading: loadingApt } = useSWR(
    appointmentId ? `${API_CONFIG.ENDPOINTS.APPOINTMENTS}/${appointmentId}` : null,
    fetcher
  )
  const { data: clients, isLoading: loadingClients } = useSWR(API_CONFIG.ENDPOINTS.CLIENTS, fetcher)
  const { data: services, isLoading: loadingServices } = useSWR(API_CONFIG.ENDPOINTS.SERVICES, fetcher)
  const { data: tenant } = useSWR(API_CONFIG.ENDPOINTS.TENANT_ME, fetcher)
  const { data: modules } = useSWR(API_CONFIG.ENDPOINTS.TENANT_MODULES, fetcher)

  const [form, setForm] = useState<AppointmentForm>(DEFAULT_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const { data: employees } = useSWR(
    form.serviceId !== "none" && form.serviceId !== ""
      ? `${API_CONFIG.ENDPOINTS.EMPLOYEES}/available-for-service/${form.serviceId}`
      : API_CONFIG.ENDPOINTS.EMPLOYEES,
    fetcher
  )

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
        notes: appointment.notes || "",
      })
    }
  }, [appointment])

  const isModuleEnabled = (moduleId: number) =>
    modules?.find((m: any) => m.module === moduleId)?.isEnabled ?? true

  function handleServiceChange(serviceId: string, serviceData?: any) {
    const selected = serviceData ?? services?.find((s: any) => s.id === serviceId)
    setForm((p) => ({
      ...p,
      serviceId,
      employeeId: "none",
      amount: selected?.price ?? p.amount,
      description: p.description || selected?.name || (serviceId === "none" ? "" : p.description),
    }))
  }

  async function updateAppointment(f: AppointmentForm): Promise<boolean> {
    if (!f.clientId) {
      toast.error("Por favor, selecione um cliente.")
      return false
    }
    if (!f.scheduledDateTime) {
      toast.error("Por favor, selecione uma data e hora.")
      return false
    }
    if (!f.durationMinutes || f.durationMinutes <= 0) {
      toast.error("Por favor, informe a duração do serviço.")
      return false
    }
    setIsSaving(true)
    try {
      const date = new Date(f.scheduledDateTime)
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.APPOINTMENTS}/${appointmentId}`, {
        method: "PUT",
        body: JSON.stringify({
          ...f,
          scheduledDateTime: date.toISOString(),
          serviceId: f.serviceId === "none" ? null : f.serviceId,
          employeeId: f.employeeId === "none" ? null : f.employeeId,
        }),
      })
      if (res.hasError) {
        toast.error(res.message || "Erro ao atualizar agendamento.")
        return false
      }
      toast.success("Agendamento atualizado com sucesso!")
      mutate(`${API_CONFIG.ENDPOINTS.APPOINTMENTS}/${appointmentId}`)
      router.push("/appointments")
      return true
    } catch {
      toast.error("Erro de conexão. Tente novamente.")
      return false
    } finally {
      setIsSaving(false)
    }
  }

  async function updateStatus(newStatus: number): Promise<boolean> {
    setIsSaving(true)
    try {
      const res = await secureApiCall(
        `${API_CONFIG.ENDPOINTS.APPOINTMENTS}/${appointmentId}/status`,
        { method: "PATCH", body: JSON.stringify(newStatus) }
      )
      if (res.hasError) {
        toast.error(res.message || "Erro ao atualizar status.")
        return false
      }
      const statusLabels: Record<number, string> = {
        0: "Pendente", 1: "Confirmado", 2: "Concluído", 3: "Cancelado", 4: "Faltou",
      }
      toast.success(`Status atualizado para ${statusLabels[newStatus] ?? newStatus}`)
      mutate(`${API_CONFIG.ENDPOINTS.APPOINTMENTS}/${appointmentId}`)
      if (appointment) {
        sendWhatsAppMessage(appointment, newStatus, !!tenant?.useWhatsappBooking)
      }
      return true
    } catch {
      toast.error("Erro ao atualizar status.")
      return false
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteAppointment(): Promise<boolean> {
    setIsDeleting(true)
    try {
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.APPOINTMENTS}/${appointmentId}`, {
        method: "DELETE",
      })
      if (res.hasError) {
        toast.error(res.message || "Erro ao excluir agendamento.")
        return false
      }
      toast.success("Agendamento excluído com sucesso!")
      router.push("/appointments")
      return true
    } catch {
      toast.error("Erro de conexão.")
      return false
    } finally {
      setIsDeleting(false)
    }
  }

  const isLoading = loadingApt || loadingClients || loadingServices

  return {
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
    handleServiceChange,
    updateAppointment,
    updateStatus,
    deleteAppointment,
  }
}
