"use client"

import { useState, useEffect, useCallback } from "react"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import type { StudentDto } from "@/types/DTOs/student.interface"
import type { MeasurementDto } from "@/types/DTOs/measurement.interface"

export function useStudents() {
  const [students, setStudents] = useState<StudentDto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await secureApiCall<StudentDto[]>(API_CONFIG.ENDPOINTS.STUDENTS, {
        method: "GET",
      })

      if (response.hasError) throw new Error(response.message ?? "Erro ao carregar alunos")

      setStudents(response.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchStudentById = useCallback(async (id: string): Promise<StudentDto | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await secureApiCall<StudentDto>(`${API_CONFIG.ENDPOINTS.STUDENTS}/${id}`, {
        method: "GET",
      })

      if (response.hasError) throw new Error(response.message ?? "Erro ao carregar aluno")

      return response.data ?? null
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const createStudent = useCallback(async (data: StudentDto): Promise<StudentDto | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await secureApiCall<StudentDto>(API_CONFIG.ENDPOINTS.STUDENTS, {
        method: "POST",
        body: JSON.stringify(data),
      })

      if (response.hasError) throw new Error(response.message ?? "Erro ao criar aluno")

      if (response.data) {
        setStudents((prev) => [...prev, response.data!])
      }

      return response.data ?? null
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updateStudent = useCallback(async (id: string, data: StudentDto): Promise<StudentDto | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await secureApiCall<StudentDto>(`${API_CONFIG.ENDPOINTS.STUDENTS}/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      })

      if (response.hasError) throw new Error(response.message ?? "Erro ao atualizar aluno")

      if (response.data) {
        setStudents((prev) => prev.map((s) => (s.userExtensionId === id ? response.data! : s)))
      }

      return response.data ?? null
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteStudent = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await secureApiCall<void>(`${API_CONFIG.ENDPOINTS.STUDENTS}/${id}`, {
        method: "DELETE",
      })

      if (response.hasError) throw new Error(response.message ?? "Erro ao excluir aluno")

      setStudents((prev) => prev.filter((s) => s.userExtensionId !== id))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const addMeasurement = useCallback(
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

        if (response.hasError) throw new Error(response.message ?? "Erro ao adicionar medição")

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

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  return {
    students,
    loading,
    error,
    fetchStudents,
    fetchStudentById,
    createStudent,
    updateStudent,
    deleteStudent,
    addMeasurement,
    clearError: () => setError(null),
  }
}
