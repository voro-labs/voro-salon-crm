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
}

const DEFAULT_FORM: NewClientForm = {
  name: "",
  phone: "",
  email: "",
  notes: "",
}

export function useClientForm() {
  const [form, setForm] = useState<NewClientForm>(DEFAULT_FORM)
  const [countryCode, setCountryCode] = useState("BR")
  const [showAnamnesis, setShowAnamnesis] = useState(false)
  const [anamnesisResponses, setAnamnesisResponses] = useState<any[]>([])
  const [isCreating, setIsCreating] = useState(false)

  async function createClient(): Promise<boolean> {
    if (!form.name.trim() || !form.phone.trim()) {
      Toast.error("Nome e telefone são obrigatórios.")
      return false
    }

    setIsCreating(true)
    try {
      const dialCode = flags[countryCode as keyof typeof flags]?.dialCodeOnlyNumber || ""
      const phoneForApi = `${dialCode}${form.phone}`

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
