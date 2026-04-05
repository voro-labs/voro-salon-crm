import useSWR from "swr"
import { API_CONFIG } from "../lib/api"
import { fetcher } from "../lib/fetcher"

export interface ServiceRecordDto {
  id: string
  clientId: string
  serviceId?: string
  serviceName?: string
  appointmentId?: string
  serviceDate: string
  description: string
  amount: number
  notes?: string
  createdAt: string
}

export function useServiceRecords() {
  const { data, error, isLoading, mutate } = useSWR<ServiceRecordDto[]>(
    API_CONFIG.ENDPOINTS.SERVICE_RECORDS,
    fetcher
  )

  return {
    serviceRecords: data,
    isLoading,
    error,
    mutate,
  }
}
