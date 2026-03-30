import { useState } from "react"
import useSWR from "swr"
import { API_CONFIG, secureApiCall } from "../lib/api"
import { fetcher } from "../lib/fetcher"
import { Toast } from "toastify-react-native"

export interface MembershipPlan {
  id: string
  name: string
  description: string | null
  price: number
  sessions: number | null
  durationDays: number
  isActive: boolean
  createdAt: string
}

export interface MembershipPlanForm {
  name: string
  description: string
  price: number
  sessions: string | number
  durationDays: number
  isActive: boolean
  unlimitedSessions: boolean
}

export const defaultMembershipPlanForm: MembershipPlanForm = {
  name: "",
  description: "",
  price: 0,
  sessions: "",
  durationDays: 30,
  isActive: true,
  unlimitedSessions: false,
}

export function useMembershipPlans() {
  const { data: plans, isLoading, mutate } = useSWR<MembershipPlan[]>(
    API_CONFIG.ENDPOINTS.CLIENT_MEMBERSHIP_PLANS,
    fetcher
  )

  const [form, setForm] = useState<MembershipPlanForm>(defaultMembershipPlanForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function savePlan(f: MembershipPlanForm): Promise<boolean> {
    if (!f.name.trim()) {
      Toast.error("Nome do plano é obrigatório.")
      return false
    }
    if (!f.durationDays || f.durationDays < 1) {
      Toast.error("Duração deve ser pelo menos 1 dia.")
      return false
    }

    setIsSaving(true)
    try {
      const payload = {
        name: f.name.trim(),
        description: f.description.trim() || null,
        price: f.price,
        sessions: f.unlimitedSessions ? null : Number(f.sessions) || null,
        durationDays: Number(f.durationDays),
        isActive: f.isActive,
      }

      const endpoint = editingId
        ? `${API_CONFIG.ENDPOINTS.CLIENT_MEMBERSHIP_PLANS}/${editingId}`
        : API_CONFIG.ENDPOINTS.CLIENT_MEMBERSHIP_PLANS

      const res = await secureApiCall(endpoint, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      })

      if (res.hasError) {
        Toast.error(res.message || "Erro ao salvar plano.")
        return false
      }

      Toast.success(editingId ? "Plano atualizado." : "Plano criado.")
      mutate()
      return true
    } catch {
      Toast.error("Erro de conexão.")
      return false
    } finally {
      setIsSaving(false)
    }
  }

  async function deletePlan(id: string): Promise<boolean> {
    setIsDeleting(true)
    try {
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.CLIENT_MEMBERSHIP_PLANS}/${id}`, {
        method: "DELETE",
      })

      if (res.hasError) {
        Toast.error(res.message || "Erro ao excluir plano.")
        return false
      }

      Toast.success("Plano excluído.")
      mutate()
      return true
    } catch {
      Toast.error("Erro de conexão.")
      return false
    } finally {
      setIsDeleting(false)
    }
  }

  return {
    plans: plans ?? [],
    isLoading,
    isSaving,
    isDeleting,
    form,
    setForm,
    editingId,
    setEditingId,
    savePlan,
    deletePlan,
    mutate,
  }
}
