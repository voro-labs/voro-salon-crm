import useSWR from "swr"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import {
  TransactionCategoryDto,
  CreateTransactionCategoryDto,
  UpdateTransactionCategoryDto,
  TransactionType
} from "@/types/DTOs/financial.interface"

export function useTransactionCategories(type?: TransactionType) {
  const url = type 
    ? `${API_CONFIG.ENDPOINTS.TRANSACTION_CATEGORIES}?type=${type}`
    : API_CONFIG.ENDPOINTS.TRANSACTION_CATEGORIES

  const { data, error, isLoading, mutate } = useSWR(url, async (url) => {
    const res = await secureApiCall<TransactionCategoryDto[]>(url, { method: "GET" })
    if (res.hasError) throw new Error(res.message || "Erro ao buscar categorias de transação")
    return res.data || []
  })

  const createCategory = async (dto: CreateTransactionCategoryDto) => {
    const res = await secureApiCall<TransactionCategoryDto>(API_CONFIG.ENDPOINTS.TRANSACTION_CATEGORIES, {
      method: "POST",
      body: JSON.stringify(dto),
    })
    if (!res.hasError) mutate()
    return res
  }

  const updateCategory = async (id: string, dto: UpdateTransactionCategoryDto) => {
    const res = await secureApiCall<TransactionCategoryDto>(`${API_CONFIG.ENDPOINTS.TRANSACTION_CATEGORIES}/${id}`, {
      method: "PUT",
      body: JSON.stringify(dto),
    })
    if (!res.hasError) mutate()
    return res
  }

  const deleteCategory = async (id: string) => {
    const res = await secureApiCall<void>(`${API_CONFIG.ENDPOINTS.TRANSACTION_CATEGORIES}/${id}`, {
      method: "DELETE",
    })
    if (!res.hasError) mutate()
    return res
  }

  return {
    categories: data,
    isLoading,
    error,
    mutate,
    createCategory,
    updateCategory,
    deleteCategory
  }
}
