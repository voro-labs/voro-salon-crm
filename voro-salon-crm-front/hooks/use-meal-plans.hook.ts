"use client"

import { useState, useEffect, useCallback } from "react"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import type { MealPlanDto } from "@/types/DTOs/meal-plan.interface"

export function useMealPlans() {
  const [mealPlans, setMealPlans] = useState<MealPlanDto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMealPlans = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await secureApiCall<MealPlanDto[]>(API_CONFIG.ENDPOINTS.MEAL_PLANS, {
        method: "GET",
      })

      if (response.hasError) throw new Error(response.message ?? "Erro ao carregar planos alimentares")

      setMealPlans(response.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMealPlanById = useCallback(async (id: string): Promise<MealPlanDto | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await secureApiCall<MealPlanDto>(`${API_CONFIG.ENDPOINTS.MEAL_PLANS}/${id}`, {
        method: "GET",
      })

      if (response.hasError) throw new Error(response.message ?? "Erro ao carregar plano alimentar")

      return response.data ?? null
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const createMealPlan = useCallback(async (data: MealPlanDto): Promise<MealPlanDto | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await secureApiCall<MealPlanDto>(API_CONFIG.ENDPOINTS.MEAL_PLANS, {
        method: "POST",
        body: JSON.stringify(data),
      })

      if (response.hasError) throw new Error(response.message ?? "Erro ao criar plano alimentar")

      if (response.data) {
        setMealPlans((prev) => [...prev, response.data!])
      }

      return response.data ?? null
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updateMealPlan = useCallback(async (id: string, data: MealPlanDto): Promise<MealPlanDto | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await secureApiCall<MealPlanDto>(`${API_CONFIG.ENDPOINTS.MEAL_PLANS}/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      })

      if (response.hasError) throw new Error(response.message ?? "Erro ao atualizar plano alimentar")

      if (response.data) {
        setMealPlans((prev) => prev.map((p) => (p.id === id ? response.data! : p)))
      }

      return response.data ?? null
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteMealPlan = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await secureApiCall<void>(`${API_CONFIG.ENDPOINTS.MEAL_PLANS}/${id}`, {
        method: "DELETE",
      })

      if (response.hasError) throw new Error(response.message ?? "Erro ao excluir plano alimentar")

      setMealPlans((prev) => prev.filter((p) => p.id !== id))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMealPlans()
  }, [fetchMealPlans])

  return {
    mealPlans,
    loading,
    error,
    fetchMealPlans,
    fetchMealPlanById,
    createMealPlan,
    updateMealPlan,
    deleteMealPlan,
    clearError: () => setError(null),
  }
}
