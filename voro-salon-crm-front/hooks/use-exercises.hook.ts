"use client"

import { useState, useEffect, useCallback } from "react"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import type { ExerciseDto } from "@/types/DTOs/exercise.interface"

export function useExercises() {
  const [exercises, setExercises] = useState<ExerciseDto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchExercises = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await secureApiCall<ExerciseDto[]>(API_CONFIG.ENDPOINTS.EXERCISES, {
        method: "GET",
      })

      if (response.hasError) throw new Error(response.message ?? "Erro ao carregar exercícios")

      setExercises(response.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchExerciseById = useCallback(async (id: string): Promise<ExerciseDto | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await secureApiCall<ExerciseDto>(`${API_CONFIG.ENDPOINTS.EXERCISES}/${id}`, {
        method: "GET",
      })

      if (response.hasError) throw new Error(response.message ?? "Erro ao carregar exercício")

      return response.data ?? null
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const createExercise = useCallback(async (data: ExerciseDto): Promise<ExerciseDto | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await secureApiCall<ExerciseDto>(API_CONFIG.ENDPOINTS.EXERCISES, {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.hasError) throw new Error(response.message ?? "Erro ao criar exercício")

      if (response.data) {
        setExercises((prev) => [...prev, response.data!])
      }

      return response.data ?? null
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updateExercise = useCallback(async (id: string, data: ExerciseDto): Promise<ExerciseDto | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await secureApiCall<ExerciseDto>(`${API_CONFIG.ENDPOINTS.EXERCISES}/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.hasError) throw new Error(response.message ?? "Erro ao atualizar exercício")

      if (response.data) {
        setExercises((prev) => prev.map((e) => (e.id === id ? response.data! : e)))
      }

      return response.data ?? null
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteExercise = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await secureApiCall<void>(`${API_CONFIG.ENDPOINTS.EXERCISES}/${id}`, {
        method: "DELETE",
      })

      if (response.hasError) throw new Error(response.message ?? "Erro ao excluir exercício")

      setExercises((prev) => prev.filter((e) => e.id !== id))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchExercises()
  }, [fetchExercises])

  return {
    exercises,
    loading,
    error,
    fetchExercises,
    fetchExerciseById,
    createExercise,
    updateExercise,
    deleteExercise,
    clearError: () => setError(null),
  }
}
