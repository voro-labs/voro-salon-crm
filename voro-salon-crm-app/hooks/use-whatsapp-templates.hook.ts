import { useState } from "react"
import useSWR from "swr"
import { API_CONFIG, secureApiCall } from "../lib/api"
import { fetcher } from "../lib/fetcher"
import { Toast } from "toastify-react-native"

export interface WhatsAppTemplate {
  id: string
  name: string
  label: string
  paramsCount: number
  paramLabels: string[] | null
  isActive: boolean
  createdAt: string
}

export interface WhatsAppTemplateForm {
  name: string
  label: string
  paramsCount: number
  paramLabelsText: string
  isActive: boolean
}

export const defaultWhatsAppTemplateForm: WhatsAppTemplateForm = {
  name: "",
  label: "",
  paramsCount: 0,
  paramLabelsText: "",
  isActive: true,
}

export function useWhatsAppTemplates() {
  const { data: templates, isLoading, mutate } = useSWR<WhatsAppTemplate[]>(
    API_CONFIG.ENDPOINTS.WHATSAPP_TEMPLATES,
    fetcher
  )

  const [form, setForm] = useState<WhatsAppTemplateForm>(defaultWhatsAppTemplateForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function saveTemplate(f: WhatsAppTemplateForm): Promise<boolean> {
    if (!f.name.trim() || !f.label.trim()) {
      Toast.error("Nome técnico e rótulo são obrigatórios.")
      return false
    }

    const paramLabels = f.paramLabelsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)

    const payload = {
      name: f.name.trim(),
      label: f.label.trim(),
      paramsCount: f.paramsCount,
      paramLabels: paramLabels.length > 0 ? paramLabels : null,
      isActive: f.isActive,
    }

    setIsSaving(true)
    try {
      const endpoint = editingId
        ? `${API_CONFIG.ENDPOINTS.WHATSAPP_TEMPLATES}/${editingId}`
        : API_CONFIG.ENDPOINTS.WHATSAPP_TEMPLATES

      const res = await secureApiCall(endpoint, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      })

      if (res.hasError) {
        Toast.error(res.message || "Erro ao salvar template.")
        return false
      }

      Toast.success(editingId ? "Template atualizado." : "Template criado.")
      mutate()
      return true
    } catch {
      Toast.error("Erro de conexão.")
      return false
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteTemplate(id: string): Promise<boolean> {
    setIsDeleting(true)
    try {
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.WHATSAPP_TEMPLATES}/${id}`, {
        method: "DELETE",
      })

      if (res.hasError) {
        Toast.error(res.message || "Erro ao excluir template.")
        return false
      }

      Toast.success("Template excluído.")
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
    templates: templates ?? [],
    isLoading,
    isSaving,
    isDeleting,
    form,
    setForm,
    editingId,
    setEditingId,
    saveTemplate,
    deleteTemplate,
    mutate,
  }
}
