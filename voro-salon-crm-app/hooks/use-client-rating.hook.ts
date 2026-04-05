import { useState } from "react"
import { Toast } from "toastify-react-native"
import { API_CONFIG, secureApiCall } from "../lib/api"
import { fetcher } from "../lib/fetcher"
import useSWR from "swr"

export interface ClientRatingPayload {
  stars: number
  comment?: string
  source: number
}

export interface ClientRatingResult {
  id: string
  appointmentId: string
  stars: number
  comment?: string
  source: number
  createdAt: string
}

export function useClientRating(appointmentId: string) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: existingRating, isLoading: isLoadingRating, mutate: mutateRating } = useSWR<ClientRatingResult | null>(
    appointmentId ? `/ClientRating/${appointmentId}` : null,
    fetcher,
    { shouldRetryOnError: false, onErrorRetry: () => {} }
  )

  async function submitRating(stars: number, comment?: string): Promise<boolean> {
    setIsSubmitting(true)
    try {
      const payload: ClientRatingPayload = {
        stars,
        source: 2, // Manual
        ...(comment && comment.trim() ? { comment: comment.trim() } : {}),
      }
      const res = await secureApiCall<ClientRatingResult>(`/ClientRating/${appointmentId}`, {
        method: "POST",
        body: JSON.stringify(payload),
      })
      if (res.hasError) {
        Toast.error(res.message || "Erro ao registrar avaliação.")
        return false
      }
      Toast.success("Avaliação registrada com sucesso!")
      await mutateRating()
      return true
    } catch {
      Toast.error("Erro de conexão. Tente novamente.")
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  async function getByAppointment(id: string): Promise<ClientRatingResult | null> {
    try {
      const res = await secureApiCall<ClientRatingResult>(`/ClientRating/${id}`, { method: "GET" })
      if (res.hasError) return null
      return res.data
    } catch {
      return null
    }
  }

  return {
    existingRating: existingRating ?? null,
    isLoadingRating,
    isSubmitting,
    submitRating,
    getByAppointment,
  }
}
