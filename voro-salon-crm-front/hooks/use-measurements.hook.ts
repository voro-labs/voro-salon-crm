"use client"

import { useState, useCallback } from "react"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import type { MeasurementDto } from "@/types/DTOs/measurement.interface"

export function useMeasurements() {
  const [measurements, setMeasurements] = useState<MeasurementDto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMeasurements = useCallback(async (studentId: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await secureApiCall<MeasurementDto[]>(
        `${API_CONFIG.ENDPOINTS.STUDENTS}/${studentId}/measurements`,
        {
          method: "GET",
        },
      )

      if (response.hasError) throw new Error(response.message ?? "Erro ao carregar medições")

      setMeasurements(response.data ?? [])
      return response.data ?? []
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMeasurementById = useCallback(
    async (studentId: string, measurementId: string): Promise<MeasurementDto | null> => {
      setLoading(true)
      setError(null)

      try {
        const response = await secureApiCall<MeasurementDto>(
          `${API_CONFIG.ENDPOINTS.STUDENTS}/${studentId}/measurements/${measurementId}`,
          {
            method: "GET",
          },
        )

        if (response.hasError) throw new Error(response.message ?? "Erro ao carregar medição")

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

  const createMeasurement = useCallback(
    async (studentId: string, data: MeasurementDto): Promise<MeasurementDto | null> => {
      setLoading(true)
      setError(null)

      try {
        const response = await secureApiCall<MeasurementDto>(
          `${API_CONFIG.ENDPOINTS.STUDENTS}/${studentId}/measurements`,
          {
            method: "POST",
            body: JSON.stringify(data),
          },
        )

        if (response.hasError) throw new Error(response.message ?? "Erro ao criar medição")

        if (response.data) {
          setMeasurements((prev) => [...prev, response.data!])
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

  const updateMeasurement = useCallback(
    async (studentId: string, measurementId: string, data: MeasurementDto): Promise<MeasurementDto | null> => {
      setLoading(true)
      setError(null)

      try {
        const response = await secureApiCall<MeasurementDto>(
          `${API_CONFIG.ENDPOINTS.STUDENTS}/${studentId}/measurements/${measurementId}`,
          {
            method: "PUT",
            body: JSON.stringify(data),
          },
        )

        if (response.hasError) throw new Error(response.message ?? "Erro ao atualizar medição")

        if (response.data) {
          setMeasurements((prev) => prev.map((m) => (m.id === measurementId ? response.data! : m)))
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

  const deleteMeasurement = useCallback(async (studentId: string, measurementId: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await secureApiCall<void>(
        `${API_CONFIG.ENDPOINTS.STUDENTS}/${studentId}/measurements/${measurementId}`,
        {
          method: "DELETE",
        },
      )

      if (response.hasError) throw new Error(response.message ?? "Erro ao excluir medição")

      setMeasurements((prev) => prev.filter((m) => m.id !== measurementId))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    measurements,
    loading,
    error,
    fetchMeasurements,
    fetchMeasurementById,
    createMeasurement,
    updateMeasurement,
    deleteMeasurement,
    clearError: () => setError(null),
  }
}
