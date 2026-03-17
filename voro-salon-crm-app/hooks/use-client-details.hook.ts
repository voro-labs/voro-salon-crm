import { useState, useEffect } from "react"
import { useRouter } from "expo-router"
import useSWR from "swr"
import { flags } from "../lib/flag-utils"
import { Toast } from "toastify-react-native"
import { API_CONFIG, secureApiCall } from "../lib/api"
import { fetcher } from "../lib/fetcher"

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
  const { data: catalogServices } = useSWR(API_CONFIG.ENDPOINTS.SERVICES, fetcher)

  const isLoading = isClientLoading || isServicesLoading || isAnamnesisLoading

  // Actions states
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAddingService, setIsAddingService] = useState(false)
  const [isAddingAnamnesis, setIsAddingAnamnesis] = useState(false)

  // Actions
  const updateClient = async (updateData: any) => {
    setIsSaving(true)
    try {
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.CLIENTS}/${clientId}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
      })
      if (res.hasError) {
        Toast.error(res.message || "Erro ao atualizar dados do cliente.")
        return false
      }
      Toast.success("Dados do cliente atualizados com sucesso!")
      await mutateClient()
      return true
    } catch {
      Toast.error("Erro de conexão. Tente novamente.")
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const deleteClient = async () => {
    setIsDeleting(true)
    try {
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.CLIENTS}/${clientId}`, { method: "DELETE" })
      if (res.hasError) {
        Toast.error(res.message || "Erro ao excluir cliente.")
        return false
      }
      Toast.success("Cliente excluído com sucesso!")
      router.push("/clients")
      return true
    } catch {
      Toast.error("Erro de conexão.")
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
      Toast.success("Serviço registrado!")
      await mutateServices()
      await mutateClient()
      return true
    } catch (err: any) {
      Toast.error(err.message || "Erro de conexão.")
      return false
    } finally {
      setIsAddingService(false)
    }
  }

  const deleteService = async (serviceId: string) => {
    try {
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.SERVICE_RECORDS}/${serviceId}`, { method: "DELETE" })
      if (res.hasError) throw new Error("Erro ao excluir serviço.")
      Toast.success("Serviço excluído!")
      await mutateServices()
      await mutateClient()
      return true
    } catch (err: any) {
      Toast.error(err.message || "Erro de conexão.")
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
      Toast.success("Anamnese salva com sucesso!")
      await mutateAnamnesis()
      return true
    } catch (err: any) {
      Toast.error(err.message || "Erro de conexão.")
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
    isSaving,
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
