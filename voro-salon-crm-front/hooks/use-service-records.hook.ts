import useSWR from "swr"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import { ServiceRecordDto } from "@/types/DTOs/service-record.interface"

export function useServiceRecords() {
  const { data, error, isLoading, mutate } = useSWR<ServiceRecordDto[]>(
    API_CONFIG.ENDPOINTS.SERVICE_RECORDS,
    async (url: string) => {
      const res = await secureApiCall<ServiceRecordDto[]>(url, { method: "GET" })
      if (res.hasError) throw new Error(res.message || "Erro ao buscar registros de serviço")
      return res.data || []
    }
  )

  return {
    serviceRecords: data,
    isLoading,
    error,
    mutate,
  }
}
