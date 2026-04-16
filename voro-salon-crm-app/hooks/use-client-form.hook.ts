import { useState } from "react"
import { router } from "expo-router"
import { Toast } from "toastify-react-native"
import { API_CONFIG, secureApiCall } from "../lib/api"
import { flags } from "../lib/flag-utils"

export interface NewClientForm {
  name: string
  phone: string
  email: string
  notes: string
  birthDate: string | null
}

const DEFAULT_FORM: NewClientForm = {
  name: "",
  phone: "",
  email: "",
  notes: "",
  birthDate: null,
}

export interface ClientFormErrors {
  name: string
  phone: string
}

const DEFAULT_ERRORS: ClientFormErrors = { name: "", phone: "" }

export function useClientForm() {
  const [form, setForm] = useState<NewClientForm>(DEFAULT_FORM)
  const [errors, setErrors] = useState<ClientFormErrors>(DEFAULT_ERRORS)
  const [countryCode, setCountryCode] = useState("BR")
  const [showAnamnesis, setShowAnamnesis] = useState(false)
  const [anamnesisResponses, setAnamnesisResponses] = useState<any[]>([])
  const [isCreating, setIsCreating] = useState(false)

  function clearFieldError(field: keyof ClientFormErrors) {
    setErrors((p) => ({ ...p, [field]: "" }))
  }

  async function createClient(): Promise<boolean> {
    const newErrors: ClientFormErrors = { name: "", phone: "" }
    if (!form.name.trim()) newErrors.name = "Nome é obrigatório."
    if (!form.phone.trim()) newErrors.phone = "Telefone é obrigatório."

    if (newErrors.name || newErrors.phone) {
      setErrors(newErrors)
      return false
    }

    setIsCreating(true)
    try {
      const dialCode = flags[countryCode as keyof typeof flags]?.dialCodeOnlyNumber || ""
      const phoneForApi = `${dialCode}${form.phone}`

      // Check for duplicate phone before creating
      const checkRes = await secureApiCall<any>(
        `${API_CONFIG.ENDPOINTS.CLIENTS}?search=${encodeURIComponent(phoneForApi)}&pageSize=1`,
        { method: "GET" }
      )
      if (!checkRes.hasError && checkRes.data) {
        const existing = checkRes.data?.items ?? (Array.isArray(checkRes.data) ? checkRes.data : [])
        if (existing.length > 0) {
          Toast.error("Já existe um cliente cadastrado com este telefone.")
          setErrors((p) => ({ ...p, phone: "Telefone já cadastrado." }))
          setIsCreating(false)
          return false
        }
      }

      let endpoint = API_CONFIG.ENDPOINTS.CLIENTS
      let body: any = { ...form, phone: phoneForApi }

      if (showAnamnesis && anamnesisResponses.length > 0) {
        endpoint = `${API_CONFIG.ENDPOINTS.ANAMNESIS}/with-client`
        body = {
          client: body,
          anamnesis: {
            date: new Date().toISOString(),
            professionalId: "00000000-0000-0000-0000-000000000000",
            responses: anamnesisResponses,
            signatures: [],
          },
        }
      }

      const res = await secureApiCall(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      })

      if (res.hasError) {
        Toast.error(res.message || "Erro ao cadastrar cliente.")
        return false
      }

      Toast.success(showAnamnesis ? "Cliente e Anamnese cadastrados!" : "Cliente cadastrado com sucesso!")
      router.push("/clients")
      return true
    } catch {
      Toast.error("Erro de conexão. Tente novamente.")
      return false
    } finally {
      setIsCreating(false)
    }
  }

  return {
    form,
    setForm,
    errors,
    clearFieldError,
    countryCode,
    setCountryCode,
    showAnamnesis,
    setShowAnamnesis,
    anamnesisResponses,
    setAnamnesisResponses,
    isCreating,
    createClient,
  }
}
