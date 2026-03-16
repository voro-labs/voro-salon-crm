import { useState } from "react"
import useSWR from "swr"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import { fetcher } from "@/lib/fetcher"

export interface NewAppointmentForm {
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

const DEFAULT_FORM: NewAppointmentForm = {
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

export function useAppointmentForm() {
  const router = useRouter()

  const { data: clients, isLoading: loadingClients, mutate: mutateClients } = useSWR(API_CONFIG.ENDPOINTS.CLIENTS, fetcher)
  const { data: services, isLoading: loadingServices, mutate: mutateServices } = useSWR(API_CONFIG.ENDPOINTS.SERVICES, fetcher)
  const { data: modules } = useSWR(API_CONFIG.ENDPOINTS.TENANT_MODULES, fetcher)

  const [form, setForm] = useState<NewAppointmentForm>(DEFAULT_FORM)
  const [isCreating, setIsCreating] = useState(false)

  const { data: employees, mutate: mutateEmployees } = useSWR(
    form.serviceId !== "none" && form.serviceId !== ""
      ? `${API_CONFIG.ENDPOINTS.EMPLOYEES}/available-for-service/${form.serviceId}`
      : API_CONFIG.ENDPOINTS.EMPLOYEES,
    fetcher
  )

  const isModuleEnabled = (moduleId: number) =>
    modules?.find((m: any) => m.module === moduleId)?.isEnabled ?? true

  function handleServiceChange(serviceId: string) {
    const selected = services?.find((s: any) => s.id === serviceId)
    setForm((p) => ({
      ...p,
      serviceId,
      amount: selected?.price ?? p.amount,
      description: p.description || selected?.name || "",
    }))
  }

  async function createAppointment(f: NewAppointmentForm): Promise<boolean> {
    if (!f.clientId) {
      toast.error("Por favor, selecione um cliente.")
      return false
    }
    if (!f.scheduledDateTime) {
      toast.error("Por favor, selecione uma data e hora.")
      return false
    }

    setIsCreating(true)
    try {
      const date = new Date(f.scheduledDateTime)
      const res = await secureApiCall(API_CONFIG.ENDPOINTS.APPOINTMENTS, {
        method: "POST",
        body: JSON.stringify({
          ...f,
          scheduledDateTime: date.toISOString(),
          serviceId: f.serviceId === "none" ? null : f.serviceId,
          employeeId: f.employeeId === "none" ? null : f.employeeId,
        }),
      })
      if (res.hasError) {
        toast.error(res.message || "Erro ao criar agendamento.")
        return false
      }
      toast.success("Agendamento criado com sucesso!")
      router.push("/appointments")
      return true
    } catch {
      toast.error("Erro de conexão. Tente novamente.")
      return false
    } finally {
      setIsCreating(false)
    }
  }

  return {
    clients,
    services,
    employees,
    form,
    setForm,
    isLoading: loadingClients || loadingServices,
    isCreating,
    isModuleEnabled,
    handleServiceChange,
    createAppointment,
    mutateClients,
    mutateServices,
    mutateEmployees,
  }
}
