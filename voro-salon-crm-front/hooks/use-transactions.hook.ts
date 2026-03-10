import useSWR from "swr"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import {
  TransactionDto,
  CreateTransactionDto,
  UpdateTransactionDto,
  PayTransactionDto
} from "@/types/DTOs/financial.interface"

interface UseTransactionsOptions {
  startDate?: string
  endDate?: string
}

export function useTransactions(options?: UseTransactionsOptions) {
  let url = API_CONFIG.ENDPOINTS.TRANSACTIONS
  const params = new URLSearchParams()
  
  if (options?.startDate) params.append("startDate", options.startDate)
  if (options?.endDate) params.append("endDate", options.endDate)

  if (params.toString()) {
    url += `?${params.toString()}`
  }

  const { data, error, isLoading, mutate } = useSWR(url, async (url) => {
    const res = await secureApiCall<TransactionDto[]>(url, { method: "GET" })
    if (res.hasError) throw new Error(res.message || "Erro ao buscar transações")
    return res.data || []
  })

  const createTransaction = async (dto: CreateTransactionDto) => {
    const res = await secureApiCall<TransactionDto>(API_CONFIG.ENDPOINTS.TRANSACTIONS, {
      method: "POST",
      body: JSON.stringify(dto),
    })
    if (!res.hasError) mutate()
    return res
  }

  const updateTransaction = async (id: string, dto: UpdateTransactionDto) => {
    const res = await secureApiCall<TransactionDto>(`${API_CONFIG.ENDPOINTS.TRANSACTIONS}/${id}`, {
      method: "PUT",
      body: JSON.stringify(dto),
    })
    if (!res.hasError) mutate()
    return res
  }

  const payTransaction = async (id: string, dto: PayTransactionDto) => {
    const res = await secureApiCall<TransactionDto>(`${API_CONFIG.ENDPOINTS.TRANSACTIONS}/${id}/pay`, {
      method: "POST",
      body: JSON.stringify(dto),
    })
    if (!res.hasError) mutate()
    return res
  }

  const cancelTransaction = async (id: string) => {
    const res = await secureApiCall<TransactionDto>(`${API_CONFIG.ENDPOINTS.TRANSACTIONS}/${id}/cancel`, {
      method: "POST",
    })
    if (!res.hasError) mutate()
    return res
  }

  const deleteTransaction = async (id: string) => {
    const res = await secureApiCall<void>(`${API_CONFIG.ENDPOINTS.TRANSACTIONS}/${id}`, {
      method: "DELETE",
    })
    if (!res.hasError) mutate()
    return res
  }

  return {
    transactions: data,
    isLoading,
    error,
    mutate,
    createTransaction,
    updateTransaction,
    payTransaction,
    cancelTransaction,
    deleteTransaction
  }
}
