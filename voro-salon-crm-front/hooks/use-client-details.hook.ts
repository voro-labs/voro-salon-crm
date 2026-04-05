import { useState } from "react"
import { useRouter } from "next/navigation"
import useSWR, { mutate } from "swr"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import { toast } from "sonner"
import { fetcher } from "@/lib/fetcher"

export function useClientDetails(clientId: string) {
  const router = useRouter()

  // SWR queries
  const { data: client, isLoading: isClientLoading, mutate: mutateClient } = useSWR(
    `${API_CONFIG.ENDPOINTS.CLIENTS}/${clientId}`,
    fetcher
  )
  const { data: services, isLoading: isServicesLoading, mutate: mutateServices } = useSWR(
    `${API_CONFIG.ENDPOINTS.SERVICE_RECORDS}?clientId=${clientId}`,
    fetcher
  )
  const { data: anamnesisHistory, isLoading: isAnamnesisLoading, mutate: mutateAnamnesis } = useSWR(
    `${API_CONFIG.ENDPOINTS.ANAMNESIS}/client/${clientId}`,
    fetcher
  )
  const { data: _catalogRaw } = useSWR(API_CONFIG.ENDPOINTS.SERVICES + "?pageSize=500", fetcher)
  const catalogServices = _catalogRaw?.items ?? (Array.isArray(_catalogRaw) ? _catalogRaw : undefined)

  const isLoading = isClientLoading || isServicesLoading || isAnamnesisLoading

  // Actions states
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAddingService, setIsAddingService] = useState(false)
  const [isAddingAnamnesis, setIsAddingAnamnesis] = useState(false)

  // Actions
  const updateClient = async (updateData: any) => {
    if (!updateData.name?.trim()) {
      toast.error("Nome é obrigatório.")
      return false
    }
    if (!updateData.phone?.trim()) {
      toast.error("Telefone é obrigatório.")
      return false
    }
    setIsUpdating(true)
    try {
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.CLIENTS}/${clientId}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
      })
      if (res.hasError) throw new Error(res.message || "Erro ao atualizar cliente.")
      toast.success("Cliente atualizado com sucesso!")
      await mutateClient()
      mutate(API_CONFIG.ENDPOINTS.CLIENTS)
      return true
    } catch (err: any) {
      toast.error(err.message || "Erro de conexão.")
      return false
    } finally {
      setIsUpdating(false)
    }
  }

  const deleteClient = async () => {
    setIsDeleting(true)
    try {
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.CLIENTS}/${clientId}`, { method: "DELETE" })
      if (res.hasError) throw new Error("Erro ao excluir cliente.")
      toast.success("Cliente excluído!")
      mutate(API_CONFIG.ENDPOINTS.CLIENTS)
      router.push("/clients")
      return true
    } catch (err: any) {
      toast.error(err.message || "Erro de conexão.")
      return false
    } finally {
      setIsDeleting(false)
    }
  }

  const addService = async (serviceData: any) => {
    setIsAddingService(true)
    try {
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.SERVICE_RECORDS}`, {
        method: "POST",
        body: JSON.stringify({ ...serviceData, clientId }),
      })
      if (res.hasError) throw new Error(res.message || "Erro ao registrar serviço.")
      toast.success("Serviço registrado!")
      await mutateServices()
      await mutateClient()
      return true
    } catch (err: any) {
      toast.error(err.message || "Erro de conexão.")
      return false
    } finally {
      setIsAddingService(false)
    }
  }

  const deleteService = async (serviceId: string) => {
    try {
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.SERVICE_RECORDS}/${serviceId}`, { method: "DELETE" })
      if (res.hasError) throw new Error("Erro ao excluir serviço.")
      toast.success("Serviço excluído!")
      await mutateServices()
      await mutateClient()
      return true
    } catch (err: any) {
      toast.error(err.message || "Erro de conexão.")
      return false
    }
  }

  const addAnamnesis = async (anamnesisData: any) => {
    setIsAddingAnamnesis(true)
    try {
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.ANAMNESIS}`, {
        method: "POST",
        body: JSON.stringify({ 
          ...anamnesisData, 
          clientId,
          professionalId: "00000000-0000-0000-0000-000000000000",
        }),
      })
      if (res.hasError) throw new Error(res.message || "Erro ao salvar anamnese.")
      toast.success("Anamnese salva com sucesso!")
      await mutateAnamnesis()
      return true
    } catch (err: any) {
      toast.error(err.message || "Erro de conexão.")
      return false
    } finally {
      setIsAddingAnamnesis(false)
    }
  }

  return {
    client,
    services: services || [],
    anamnesisHistory: anamnesisHistory || [],
    catalogServices: catalogServices || [],
    isLoading,
    isClientLoading,
    isUpdating,
    isDeleting,
    isAddingService,
    isAddingAnamnesis,
    updateClient,
    deleteClient,
    addService,
    deleteService,
    addAnamnesis,
  }
}
