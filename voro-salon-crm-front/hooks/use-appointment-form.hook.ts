import { useState } from "react"
import useSWR from "swr"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import { fetcher } from "@/lib/fetcher"

export interface NewAppointmentForm {
  clientId: string
  serviceId: string
  serviceIds: string[]
  employeeId: string
  scheduledDateTime: string
  durationMinutes: number
  status: number
  description: string
  amount: number
  notes: string
  isEncaixe?: boolean
}

const DEFAULT_FORM: NewAppointmentForm = {
  clientId: "",
  serviceId: "none",
  serviceIds: [],
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

  const { data: _clientsRaw, isLoading: loadingClients, mutate: mutateClients } = useSWR(API_CONFIG.ENDPOINTS.CLIENTS + "?pageSize=500", fetcher)
  const { data: _servicesRaw, isLoading: loadingServices, mutate: mutateServices } = useSWR(API_CONFIG.ENDPOINTS.SERVICES + "?pageSize=500", fetcher)
  const clients = _clientsRaw?.items ?? (Array.isArray(_clientsRaw) ? _clientsRaw : undefined)
  const services = _servicesRaw?.items ?? (Array.isArray(_servicesRaw) ? _servicesRaw : undefined)
  const { data: modules } = useSWR(API_CONFIG.ENDPOINTS.TENANT_MODULES, fetcher)

  const [form, setForm] = useState<NewAppointmentForm>(DEFAULT_FORM)
  const [isCreating, setIsCreating] = useState(false)
  const [activePromotion, setActivePromotion] = useState<{ serviceName: string; originalPrice: number; promotionalPrice: number } | null>(null)

  const { data: clientMemberships } = useSWR(
    form.clientId ? `${API_CONFIG.ENDPOINTS.CLIENT_MEMBERSHIPS}/client/${form.clientId}` : null,
    fetcher
  )

  const activeMembership = clientMemberships?.find(
    (m: any) => m.status === 0 && new Date(m.endDate) >= new Date() && (m.remainingSessions === null || m.remainingSessions > 0)
  ) ?? null

  const { data: _employeesRaw, mutate: mutateEmployees } = useSWR(
    form.serviceId !== "none" && form.serviceId !== ""
      ? `${API_CONFIG.ENDPOINTS.EMPLOYEES}/available-for-service/${form.serviceId}`
      : `${API_CONFIG.ENDPOINTS.EMPLOYEES}?pageSize=500`,
    fetcher
  )
  const employees = _employeesRaw?.items ?? (Array.isArray(_employeesRaw) ? _employeesRaw : undefined)

  const isModuleEnabled = (moduleId: number) =>
    modules?.find((m: any) => m.module === moduleId)?.isEnabled ?? true

  function handleServiceChange(serviceId: string, serviceData?: any) {
    const selected = serviceData ?? services?.find((s: any) => s.id === serviceId)
    const hasPromo = !!(selected?.hasPromotion && selected?.promotionalPrice)
    setActivePromotion(hasPromo ? {
      serviceName: selected.name,
      originalPrice: selected.price,
      promotionalPrice: selected.promotionalPrice,
    } : null)
    setForm((p) => ({
      ...p,
      serviceId,
      employeeId: "none",
      amount: hasPromo ? selected.promotionalPrice : (selected?.price ?? p.amount),
      durationMinutes: selected?.durationMinutes ?? p.durationMinutes,
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
    if (!f.durationMinutes || f.durationMinutes <= 0) {
      toast.error("Por favor, informe a duração do serviço.")
      return false
    }
    if (!f.amount || f.amount <= 0) {
      toast.error("Por favor, informe o valor do agendamento.")
      return false
    }
    if (!f.description.trim()) {
      toast.error("Por favor, informe a descrição do agendamento.")
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
          serviceIds: f.serviceIds.length > 0 ? f.serviceIds : undefined,
          isEncaixe: f.isEncaixe ?? false,
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
    activeMembership,
    activePromotion,
  }
}
