import { useState, useEffect } from "react"
import useSWR from "swr"
import { Toast } from "toastify-react-native"
import { API_CONFIG, secureApiCall } from "../lib/api"
import { fetcher } from "../lib/fetcher"

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
  isEncaixe?: boolean
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

export function useAppointmentForm(id?: string) {
  const { data: _clientsRaw, isLoading: loadingClients, mutate: mutateClients } = useSWR(API_CONFIG.ENDPOINTS.CLIENTS + "?pageSize=500", fetcher)
  const { data: _servicesRaw, isLoading: loadingServices, mutate: mutateServices } = useSWR(API_CONFIG.ENDPOINTS.SERVICES + "?pageSize=500", fetcher)
  const clients = _clientsRaw?.items ?? (Array.isArray(_clientsRaw) ? _clientsRaw : undefined)
  const services = _servicesRaw?.items ?? (Array.isArray(_servicesRaw) ? _servicesRaw : undefined)
  const { data: modules } = useSWR(API_CONFIG.ENDPOINTS.TENANT_MODULES, fetcher)

  const [form, setForm] = useState<NewAppointmentForm>(DEFAULT_FORM)
  const [isCreating, setIsCreating] = useState(false)
  const [activePromotion, setActivePromotion] = useState<{ serviceName: string; originalPrice: number; promotionalPrice: number } | null>(null)

  // Fetch existing appointment data when editing
  const { data: existingAppointment, isLoading: loadingAppointment } = useSWR(
    id ? `${API_CONFIG.ENDPOINTS.APPOINTMENTS}/${id}` : null,
    fetcher
  )

  // Populate form with existing data once loaded
  useEffect(() => {
    if (!id || !existingAppointment) return
    const a = existingAppointment as any
    setForm({
      clientId: a.clientId ?? "",
      serviceId: a.serviceId ?? "none",
      employeeId: a.employeeId ?? "none",
      scheduledDateTime: a.scheduledDateTime ?? "",
      durationMinutes: a.durationMinutes ?? 30,
      status: a.status ?? 0,
      description: a.description ?? "",
      amount: a.amount ?? 0,
      notes: a.notes ?? "",
      isEncaixe: a.isEncaixe ?? false,
    })
  }, [id, existingAppointment])

  const { data: _employeesRaw, mutate: mutateEmployees } = useSWR(
    form.serviceId !== "none" && form.serviceId !== ""
      ? `${API_CONFIG.ENDPOINTS.EMPLOYEES}/available-for-service/${form.serviceId}`
      : `${API_CONFIG.ENDPOINTS.EMPLOYEES}?pageSize=500`,
    fetcher
  )
  const employees = _employeesRaw?.items ?? (Array.isArray(_employeesRaw) ? _employeesRaw : undefined)

  const isModuleEnabled = (moduleId: number) =>
    modules?.find((m: any) => m.module === moduleId)?.isEnabled ?? true

  function handleServiceChange(serviceId: string) {
    const selected = services?.find((s: any) => s.id === serviceId)
    const hasPromo = !!(selected?.hasPromotion && selected?.promotionalPrice)
    setActivePromotion(hasPromo ? {
      serviceName: selected.name,
      originalPrice: selected.price,
      promotionalPrice: selected.promotionalPrice,
    } : null)
    setForm((p) => ({
      ...p,
      serviceId,
      amount: hasPromo ? selected.promotionalPrice : (selected?.price ?? p.amount),
      description: p.description || selected?.name || "",
      durationMinutes: selected?.durationMinutes ?? p.durationMinutes,
    }))
  }

  async function createAppointment(f: NewAppointmentForm): Promise<boolean> {
    if (isModuleEnabled(1) && !f.clientId) {
      Toast.error("Por favor, selecione um cliente.")
      return false
    }
    if (!f.scheduledDateTime) {
      Toast.error("Por favor, selecione uma data e hora.")
      return false
    }

    setIsCreating(true)
    try {
      const date = new Date(f.scheduledDateTime)
      const body = JSON.stringify({
        ...f,
        scheduledDateTime: date.toISOString(),
        serviceId: f.serviceId === "none" ? null : f.serviceId,
        employeeId: f.employeeId === "none" ? null : f.employeeId,
        isEncaixe: f.isEncaixe ?? false,
      })

      const endpoint = id
        ? `${API_CONFIG.ENDPOINTS.APPOINTMENTS}/${id}`
        : API_CONFIG.ENDPOINTS.APPOINTMENTS

      const res = await secureApiCall(endpoint, {
        method: id ? "PUT" : "POST",
        body,
      })

      if (res.hasError) {
        Toast.error(res.message || (id ? "Erro ao atualizar agendamento." : "Erro ao criar agendamento."))
        return false
      }

      Toast.success(id ? "Agendamento atualizado!" : "Agendamento criado com sucesso!")
      return true
    } catch {
      Toast.error("Erro de conexão. Tente novamente.")
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
    isLoading: loadingClients || loadingServices || (!!id && loadingAppointment),
    isCreating,
    isModuleEnabled,
    handleServiceChange,
    createAppointment,
    mutateClients,
    mutateServices,
    mutateEmployees,
    activePromotion,
  }
}
