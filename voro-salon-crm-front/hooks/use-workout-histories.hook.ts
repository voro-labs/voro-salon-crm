"use client"

import { useState, useCallback } from "react"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import type { WorkoutHistoryDto } from "@/types/DTOs/workout-history.interface"

export function useWorkoutHistories() {
  const [workoutHistories, setWorkoutHistories] = useState<WorkoutHistoryDto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkoutHistories = useCallback(async (studentId?: string) => {
    setLoading(true)
    setError(null)

    try {
      const url = studentId
        ? `${API_CONFIG.ENDPOINTS.WORKOUT_HISTORIES}?studentId=${studentId}`
        : API_CONFIG.ENDPOINTS.WORKOUT_HISTORIES

      const response = await secureApiCall<WorkoutHistoryDto[]>(url, {
        method: "GET",
      })

      if (response.hasError) throw new Error(response.message ?? "Erro ao carregar histórico de treinos")

      setWorkoutHistories(response.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }, [])

  const createWorkoutHistory = useCallback(
    async (data: WorkoutHistoryDto): Promise<WorkoutHistoryDto | null> => {
      setLoading(true)
      setError(null)

      try {
        const response = await secureApiCall<WorkoutHistoryDto>(API_CONFIG.ENDPOINTS.WORKOUT_HISTORIES, {
          method: "POST",
          body: JSON.stringify(data),
        })

        if (response.hasError) throw new Error(response.message ?? "Erro ao criar histórico de treino")

        if (response.data) {
          setWorkoutHistories((prev) => [...prev, response.data!])
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

  const updateWorkoutHistory = useCallback(
    async (id: string, data: WorkoutHistoryDto): Promise<WorkoutHistoryDto | null> => {
      setLoading(true)
      setError(null)

      try {
        const response = await secureApiCall<WorkoutHistoryDto>(`${API_CONFIG.ENDPOINTS.WORKOUT_HISTORIES}/${id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        })

        if (response.hasError) throw new Error(response.message ?? "Erro ao atualizar histórico de treino")

        if (response.data) {
          setWorkoutHistories((prev) => prev.map((h) => (h.id === id ? response.data! : h)))
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

  return {
    workoutHistories,
    loading,
    error,
    fetchWorkoutHistories,
    createWorkoutHistory,
    updateWorkoutHistory,
    clearError: () => setError(null),
  }
}
