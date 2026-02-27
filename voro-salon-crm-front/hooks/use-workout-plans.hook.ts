"use client"

import { useState, useEffect, useCallback } from "react"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import type { WorkoutPlanDto } from "@/types/DTOs/workout-plan.interface"

export function useWorkoutPlans() {
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlanDto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkoutPlans = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await secureApiCall<WorkoutPlanDto[]>(API_CONFIG.ENDPOINTS.WORKOUT_PLANS, {
        method: "GET",
      })

      if (response.hasError) throw new Error(response.message ?? "Erro ao carregar planos de treino")

      setWorkoutPlans(response.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchWorkoutPlanById = useCallback(async (id: string): Promise<WorkoutPlanDto | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await secureApiCall<WorkoutPlanDto>(`${API_CONFIG.ENDPOINTS.WORKOUT_PLANS}/${id}`, {
        method: "GET",
      })

      if (response.hasError) throw new Error(response.message ?? "Erro ao carregar plano de treino")

      return response.data ?? null
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const createWorkoutPlan = useCallback(async (data: WorkoutPlanDto): Promise<WorkoutPlanDto | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await secureApiCall<WorkoutPlanDto>(API_CONFIG.ENDPOINTS.WORKOUT_PLANS, {
        method: "POST",
        body: JSON.stringify(data),
      })

      if (response.hasError) throw new Error(response.message ?? "Erro ao criar plano de treino")

      if (response.data) {
        setWorkoutPlans((prev) => [...prev, response.data!])
      }

      return response.data ?? null
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updateWorkoutPlan = useCallback(
    async (id: string, data: WorkoutPlanDto): Promise<WorkoutPlanDto | null> => {
      setLoading(true)
      setError(null)

      try {
        const response = await secureApiCall<WorkoutPlanDto>(`${API_CONFIG.ENDPOINTS.WORKOUT_PLANS}/${id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        })

        if (response.hasError) throw new Error(response.message ?? "Erro ao atualizar plano de treino")

        if (response.data) {
          setWorkoutPlans((prev) => prev.map((p) => (p.id === id ? response.data! : p)))
        }

        return response.data ?? null
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido")
        return null
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const deleteWorkoutPlan = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await secureApiCall<void>(`${API_CONFIG.ENDPOINTS.WORKOUT_PLANS}/${id}`, {
        method: "DELETE",
      })

      if (response.hasError) throw new Error(response.message ?? "Erro ao excluir plano de treino")

      setWorkoutPlans((prev) => prev.filter((p) => p.id !== id))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWorkoutPlans()
  }, [fetchWorkoutPlans])

  return {
    workoutPlans,
    loading,
    error,
    fetchWorkoutPlans,
    fetchWorkoutPlanById,
    createWorkoutPlan,
    updateWorkoutPlan,
    deleteWorkoutPlan,
    clearError: () => setError(null),
  }
}
