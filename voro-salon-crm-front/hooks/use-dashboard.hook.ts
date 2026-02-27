"use client"

import { useState, useEffect, useCallback } from "react"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import type { DashboardDataDto } from "@/types/DTOs/dashboard-data.interface"

export function useDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardDataDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await secureApiCall<DashboardDataDto>(API_CONFIG.ENDPOINTS.DASHBOARD, {
        method: "GET",
      })

      if (response.hasError) {
        throw new Error(response.message ?? "Erro ao carregar dados do dashboard")
      }

      setDashboardData(response.data ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  return {
    dashboardData,
    loading,
    error,
    refetch: fetchDashboardData,
    clearError: () => setError(null),
  }
}
