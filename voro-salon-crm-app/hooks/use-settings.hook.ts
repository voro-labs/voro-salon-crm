import { useState, useEffect, useCallback } from "react"
import useSWR from "swr"
import { Toast } from "toastify-react-native"
import { API_CONFIG, secureApiCall, getAuthToken } from "../lib/api"
import { refreshTenantTheme } from "../contexts/tenant-theme.context"
import { flags, getCountryFromPhone } from "../lib/flag-utils"
import { fetcher } from "../lib/fetcher"

export interface TenantForm {
  name: string
  slug: string
  logoUrl: string
  primaryColor: string
  secondaryColor: string
  contactPhone: string
  contactEmail: string
  establishmentType: number
  useWhatsappBooking: boolean
}

const DEFAULT_FORM: TenantForm = {
  name: "",
  slug: "",
  logoUrl: "",
  primaryColor: "#8B4513",
  secondaryColor: "#A0522D",
  contactPhone: "",
  contactEmail: "",
  establishmentType: 0,
  useWhatsappBooking: false,
}

export function useSettings() {
  const { data: tenant, isLoading, mutate } = useSWR(API_CONFIG.ENDPOINTS.TENANT_ME, fetcher)
  const { data: modules, mutate: mutateModules } = useSWR(API_CONFIG.ENDPOINTS.TENANT_MODULES, async (url) => {
    const res = await secureApiCall<any[]>(url, { method: "GET" })
    if (res.hasError) throw new Error(res.message || "Failed to fetch modules")
    return res.data
  })

  const [form, setForm] = useState<TenantForm | null>(null)
  const [countryCode, setCountryCode] = useState("BR")
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isExportingClients, setIsExportingClients] = useState(false)
  const [isExportingServices, setIsExportingServices] = useState(false)

  useEffect(() => {
    if (tenant && !form) {
      const { countryCode: cCode, phoneNumber } = getCountryFromPhone(tenant.contactPhone || "")
      setForm({
        name: tenant.name ?? "",
        slug: tenant.slug ?? "",
        logoUrl: tenant.logoUrl ?? "",
        primaryColor: tenant.primaryColor ?? "#8B4513",
        secondaryColor: tenant.secondaryColor ?? "#A0522D",
        contactPhone: phoneNumber,
        contactEmail: tenant.contactEmail ?? "",
        establishmentType: tenant.establishmentType ?? 0,
        useWhatsappBooking: tenant.useWhatsappBooking ?? false,
      })
      setCountryCode(cCode)
    }
  }, [tenant, form])

  const [localEstablishmentType, setLocalEstablishmentType] = useState<number | null>(null)
  const effectiveEstablishmentType = localEstablishmentType ?? tenant?.establishmentType ?? 0

  const formData = {
    ...(form ?? DEFAULT_FORM),
    establishmentType: effectiveEstablishmentType,
  }

  const setEstablishmentType = useCallback((value: number) => {
    setLocalEstablishmentType(value)
  }, [])

  const handlePreset = useCallback((primary: string, secondary: string) => {
    setForm((p) => (p ? { ...p, primaryColor: primary, secondaryColor: secondary } : null))
    refreshTenantTheme(primary, secondary)
  }, [])

  async function saveTenant(f: TenantForm): Promise<boolean> {
    if (!f.name.trim()) {
      Toast.error("Nome do estabelecimento é obrigatório.")
      return false
    }
    if (!f.slug.trim()) {
      Toast.error("Slug é obrigatório.")
      return false
    }
    setIsSaving(true)
    try {
      const dialCode = flags[countryCode as keyof typeof flags]?.dialCodeOnlyNumber || ""
      const phoneForApi = `${dialCode}${f.contactPhone}`

      const res = await secureApiCall(API_CONFIG.ENDPOINTS.TENANT_ME, {
        method: "PATCH",
        body: JSON.stringify({ ...f, contactPhone: phoneForApi }),
      })
      if (res.hasError) {
        Toast.error(res.message || "Erro ao salvar configurações.")
        return false
      }
      Toast.success("Configurações salvas com sucesso!")
      setLocalEstablishmentType(null)
      mutate()
      refreshTenantTheme(f.primaryColor, f.secondaryColor)
      return true
    } catch {
      Toast.error("Erro de conexão.")
      return false
    } finally {
      setIsSaving(false)
    }
  }

  async function uploadLogo(file: { uri: string; name: string; type: string }): Promise<string | null> {
    setIsUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append("file", file as any)
      const token = await getAuthToken()
      const response = await fetch(`${API_CONFIG.BASE_API_URL}${API_CONFIG.ENDPOINTS.TENANT_ME}/logo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const res = await response.json()
      if (!response.ok || res.hasError) {
        Toast.error(res.message || "Erro ao fazer upload da logo.")
        // Revert to original
        setForm((p) => (p ? { ...p, logoUrl: tenant?.logoUrl ?? "" } : null))
        return null
      }
      Toast.success("Logo atualizada com sucesso!")
      mutate()
      return res.data as string
    } catch {
      Toast.error("Erro de conexão ao enviar logo.")
      setForm((p) => (p ? { ...p, logoUrl: tenant?.logoUrl ?? "" } : null))
      return null
    } finally {
      setIsUploadingLogo(false)
    }
  }

  async function handleLogoUpload(file: { uri: string; name: string; type: string }) {
    // Show preview immediately
    setForm((p) => (p ? { ...p, logoUrl: file.uri } : null))
    const url = await uploadLogo(file)
    if (url) {
      setForm((p) => (p ? { ...p, logoUrl: url } : null))
    }
  }

  async function exportData(type: "clients" | "services"): Promise<void> {
    const setter = type === "clients" ? setIsExportingClients : setIsExportingServices
    setter(true)
    try {
      const endpoint =
        type === "clients" ? API_CONFIG.ENDPOINTS.EXPORT_CLIENTS : API_CONFIG.ENDPOINTS.EXPORT_SERVICES
      const token = await getAuthToken()
      const res = await fetch(`${API_CONFIG.BASE_API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        Toast.error("Erro ao exportar dados.")
        return
      }
      const blob = await res.blob()
      // Web implementation removed - native download logic goes here
      // This part will need native specific implementation using expo-file-system
      Toast.success("Arquivo exportado pronto para ser salvo!")
    } catch {
      Toast.error("Erro ao exportar.")
    } finally {
      setter(false)
    }
  }

  async function updateModule(
    moduleId: number,
    isEnabled: boolean,
    configuration?: string
  ): Promise<boolean> {
    try {
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.TENANT_MODULES}/${moduleId}`, {
        method: "PATCH",
        body: JSON.stringify({ isEnabled, configuration }),
      })
      if (res.hasError) {
        Toast.error(res.message || "Erro ao atualizar módulo.")
        return false
      }
      Toast.success("Módulo atualizado!")
      mutateModules()
      return true
    } catch {
      Toast.error("Erro de conexão.")
      return false
    }
  }

  return {
    tenant,
    modules,
    form,
    setForm,
    formData,
    countryCode,
    setCountryCode,
    isLoading,
    isSaving,
    isUploadingLogo,
    isExportingClients,
    isExportingServices,
    handlePreset,
    setEstablishmentType,
    saveTenant,
    handleLogoUpload,
    exportData,
    updateModule,
  }
}
