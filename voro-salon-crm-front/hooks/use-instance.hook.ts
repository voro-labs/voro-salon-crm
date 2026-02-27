"use client"

import { useState, useEffect, useCallback } from "react"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import type { InstanceDto } from "@/types/DTOs/instance.interface"
import type { QrCodeJsonDto } from "@/types/DTOs/qr-code-json.interface"

export function useInstances() {
  const [instances, setInstances] = useState<InstanceDto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadInstances = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await secureApiCall<InstanceDto[]>(API_CONFIG.ENDPOINTS.INSTANCE, { method: "GET" })

      if (response.hasError) {
        throw new Error(response.message ?? "Erro ao carregar instâncias")
      }

      setInstances(response.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }, [])

  const createInstance = useCallback(async (instanceName: string, number: string): Promise<InstanceDto | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await secureApiCall<InstanceDto>(`${API_CONFIG.ENDPOINTS.INSTANCE}/${number}`, {
        method: "POST",
        body: JSON.stringify({ instanceName }),
        headers: { "Content-Type": "application/json" },
      })

      if (response.hasError) {
        throw new Error(response.message ?? "Erro ao criar instância")
      }

      if (response.data) {
        setInstances((prev) => [...prev, response.data!])
      }

      return response.data ?? null
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteInstance = useCallback(async (instanceName: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await secureApiCall<void>(`${API_CONFIG.ENDPOINTS.INSTANCE}/${instanceName}`, {
        method: "DELETE",
      })

      if (response.hasError) {
        throw new Error(response.message ?? "Erro ao excluir instância")
      }

      setInstances((prev) => prev.filter((inst) => inst.name !== instanceName))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const getStatus = useCallback(async (instanceName: string): Promise<InstanceDto | null> => {
    setError(null)

    try {
      const response = await secureApiCall<InstanceDto>(`${API_CONFIG.ENDPOINTS.INSTANCE}/${instanceName}/status`, {
        method: "GET",
      })

      if (response.hasError) {
        throw new Error(response.message ?? "Erro ao atualizar QR Code")
      }

      if (response.data) {
        setInstances((prev) =>
          prev.map((inst) =>
            inst.name === instanceName
              ? {
                  ...inst,
                  instanceExtension: inst.instanceExtension
                    ? {
                        ...inst.instanceExtension,
                        status: response.data?.instanceExtension?.status,
                      }
                    : response.data?.instanceExtension,
                }
              : inst,
          ),
        )
      }

      return response.data ?? null
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
      return null
    }
  }, [])

  const refreshQrCode = useCallback(async (instanceName: string): Promise<QrCodeJsonDto | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await secureApiCall<QrCodeJsonDto>(`${API_CONFIG.ENDPOINTS.INSTANCE}/${instanceName}/qrcode`, {
        method: "GET",
      })

      if (response.hasError) {
        throw new Error(response.message ?? "Erro ao atualizar QR Code")
      }

      if (response.data) {
        setInstances((prev) =>
          prev.map((inst) =>
            inst.name === instanceName
              ? {
                  ...inst,
                  instanceExtension: inst.instanceExtension
                    ? {
                        ...inst.instanceExtension,
                        base64: response.data?.base64,
                      }
                    : { base64: response.data?.base64 },
                }
              : inst,
          ),
        )
      }

      return response.data ?? null
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInstances()
  }, [loadInstances])

  return {
    instances,
    loading,
    error,
    loadInstances,
    createInstance,
    deleteInstance,
    getStatus,
    refreshQrCode,
    clearError: () => setError(null),
  }
}
