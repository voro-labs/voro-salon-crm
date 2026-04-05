import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import { flags } from "@/lib/flag-utils"

export interface NewClientForm {
  name: string
  phone: string
  email: string
  notes: string
  birthDate: string
}

const DEFAULT_FORM: NewClientForm = {
  name: "",
  phone: "",
  email: "",
  notes: "",
  birthDate: "",
}

export function useClientForm() {
  const router = useRouter()
  const [form, setForm] = useState<NewClientForm>(DEFAULT_FORM)
  const [countryCode, setCountryCode] = useState("BR")
  const [showAnamnesis, setShowAnamnesis] = useState(false)
  const [anamnesisResponses, setAnamnesisResponses] = useState<any[]>([])
  const [isCreating, setIsCreating] = useState(false)

  async function createClient(): Promise<boolean> {
    if (!form.name.trim()) {
      toast.error("Nome é obrigatório.")
      return false
    }
    if (!form.phone.trim()) {
      toast.error("Telefone é obrigatório.")
      return false
    }

    setIsCreating(true)
    try {
      const dialCode = flags[countryCode]?.dialCodeOnlyNumber || ""
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
        toast.error(res.message || "Erro ao cadastrar cliente.")
        return false
      }

      toast.success(showAnamnesis ? "Cliente e Anamnese cadastrados!" : "Cliente cadastrado com sucesso!")
      router.push("/clients")
      router.refresh()
      return true
    } catch {
      toast.error("Erro de conexão. Tente novamente.")
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
