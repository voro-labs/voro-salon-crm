import { useState, useEffect } from "react"
import useSWR, { mutate } from "swr"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import { fetcher } from "@/lib/fetcher"

export interface ServiceForm {
  name: string
  description: string
  price: number
  durationMinutes: number
}

const DEFAULT_FORM: ServiceForm = {
  name: "",
  description: "",
  price: 0,
  durationMinutes: 30,
}

export function useServiceDetail(serviceId?: string) {
  const router = useRouter()

  const { data: service, isLoading } = useSWR(
    serviceId ? `${API_CONFIG.ENDPOINTS.SERVICES}/${serviceId}` : null,
    fetcher
  )

  const [form, setForm] = useState<ServiceForm>(DEFAULT_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (service) {
      setForm({
        name: service.name,
        description: service.description || "",
        price: service.price || 0,
        durationMinutes: service.durationMinutes || 30,
      })
    }
  }, [service])

  async function createService(f: ServiceForm): Promise<boolean> {
    if (!f.name.trim()) {
      toast.error("O nome do serviço é obrigatório.")
      return false
    }
    if (!f.price || f.price <= 0) {
      toast.error("O preço do serviço é obrigatório.")
      return false
    }
    setIsSaving(true)
    try {
      const res = await secureApiCall(API_CONFIG.ENDPOINTS.SERVICES, {
        method: "POST",
        body: JSON.stringify(f),
      })
      if (res.hasError) {
        toast.error(res.message || "Erro ao criar serviço.")
        return false
      }
      toast.success("Serviço criado com sucesso!")
      mutate(API_CONFIG.ENDPOINTS.SERVICES)
      router.push("/services")
      return true
    } catch {
      toast.error("Erro de conexão. Tente novamente.")
      return false
    } finally {
      setIsSaving(false)
    }
  }

  async function updateService(f: ServiceForm): Promise<boolean> {
    if (!f.name.trim()) {
      toast.error("O nome do serviço é obrigatório.")
      return false
    }
    if (!f.price || f.price <= 0) {
      toast.error("O preço do serviço é obrigatório.")
      return false
    }
    setIsSaving(true)
    try {
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.SERVICES}/${serviceId}`, {
        method: "PUT",
        body: JSON.stringify(f),
      })
      if (res.hasError) {
        toast.error(res.message || "Erro ao atualizar serviço.")
        return false
      }
      toast.success("Serviço atualizado com sucesso!")
      mutate(`${API_CONFIG.ENDPOINTS.SERVICES}/${serviceId}`)
      mutate(API_CONFIG.ENDPOINTS.SERVICES)
      router.push("/services")
      return true
    } catch {
      toast.error("Erro de conexão. Tente novamente.")
      return false
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteService(): Promise<boolean> {
    setIsDeleting(true)
    try {
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.SERVICES}/${serviceId}`, {
        method: "DELETE",
      })
      if (res.hasError) {
        toast.error(res.message || "Erro ao excluir serviço.")
        return false
      }
      toast.success("Serviço excluído com sucesso!")
      mutate(API_CONFIG.ENDPOINTS.SERVICES)
      router.push("/services")
      return true
    } catch {
      toast.error("Erro de conexão.")
      return false
    } finally {
      setIsDeleting(false)
    }
  }

  return {
    service,
    form,
    setForm,
    isLoading,
    isSaving,
    isDeleting,
    createService,
    updateService,
    deleteService,
  }
}
