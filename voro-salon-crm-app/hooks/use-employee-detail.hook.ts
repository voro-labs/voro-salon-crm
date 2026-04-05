import { useState, useEffect } from "react"
import useSWR from "swr"
import { router } from "expo-router"
import { Toast } from "toastify-react-native"
import { API_CONFIG, secureApiCall, getAuthToken } from "../lib/api"
import { fetcher } from "../lib/fetcher"

export interface EmployeeForm {
  name: string
  photoUrl: string
  hireDate: string
  isActive: boolean
  specialtyIds: string[]
  commissionPercentage?: number
}

const DEFAULT_FORM: EmployeeForm = {
  name: "",
  photoUrl: "",
  hireDate: new Date().toISOString().split("T")[0],
  isActive: true,
  specialtyIds: [],
  commissionPercentage: undefined,
}

export function useEmployeeDetail(employeeId?: string, onDeleted?: () => void) {
  const isNew = !employeeId || employeeId === "new"

  const { data: employee, isLoading: isLoadingEmp } = useSWR(
    !isNew ? `${API_CONFIG.ENDPOINTS.EMPLOYEES}/${employeeId}` : null,
    fetcher
  )
  const { data: services } = useSWR(API_CONFIG.ENDPOINTS.SERVICES, fetcher)

  const [form, setForm] = useState<EmployeeForm>(DEFAULT_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)

  useEffect(() => {
    if (employee) {
      setForm({
        name: employee.name,
        photoUrl: employee.photoUrl || "",
        hireDate: new Date(employee.hireDate).toISOString().split("T")[0],
        isActive: employee.isActive,
        specialtyIds: employee.specialtyIds || [],
        commissionPercentage: employee.commissionPercentage ?? undefined,
      })
    }
  }, [employee])

  function toggleSpecialty(serviceId: string) {
    setForm((p) => ({
      ...p,
      specialtyIds: p.specialtyIds.includes(serviceId)
        ? p.specialtyIds.filter((sid) => sid !== serviceId)
        : [...p.specialtyIds, serviceId],
    }))
  }

  async function uploadPhoto(file: { uri: string; name: string; type: string }, targetId: string): Promise<string | null> {
    const formData = new FormData()
    formData.append("file", file as any)
    try {
      const token = await getAuthToken()
      const response = await fetch(
        `${API_CONFIG.BASE_API_URL}${API_CONFIG.ENDPOINTS.EMPLOYEES}/${targetId}/photo`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      )
      const res = await response.json()
      if (!response.ok || res.hasError) {
        Toast.error(res.message || "Erro ao fazer upload da foto.")
        return null
      }
      return res.data as string
    } catch {
      Toast.error("Erro de conexão ao enviar foto.")
      return null
    }
  }

  async function handlePhotoUpload(file: { uri: string; name: string; type: string }) {
    if (isNew) {
      // Just store preview for now; actual upload happens after creation
      setForm((p) => ({ ...p, photoUrl: file.uri }))
    } else {
      setIsUploadingPhoto(true)
      const url = await uploadPhoto(file, employeeId!)
      if (url) {
        Toast.success("Foto atualizada!")
        setForm((p) => ({ ...p, photoUrl: url }))
      }
      setIsUploadingPhoto(false)
    }
  }

  async function saveEmployee(f: EmployeeForm): Promise<boolean> {
    if (!f.name.trim()) {
      Toast.error("Nome é obrigatório.")
      return false
    }
    setIsSaving(true)
    try {
      const endpoint = isNew
        ? API_CONFIG.ENDPOINTS.EMPLOYEES
        : `${API_CONFIG.ENDPOINTS.EMPLOYEES}/${employeeId}`
      const method = isNew ? "POST" : "PUT"

      const res = await secureApiCall<any>(endpoint, {
        method,
        body: JSON.stringify(f),
      })

      if (res.hasError) {
        Toast.error(res.message || "Erro ao salvar funcionário.")
        return false
      }

      // If new employee with a local photo, upload it now
      if (isNew && !f.photoUrl.startsWith("http")) {
        try {
          const file = { uri: f.photoUrl, name: "photo.jpg", type: "image/jpeg" }
          await uploadPhoto(file, res.data.id)
        } catch (err) {
          console.error("Erro no upload pós-criação:", err)
        }
      }

      Toast.success(isNew ? "Funcionário cadastrado!" : "Dados atualizados!")
      router.back()
      return true
    } catch {
      Toast.error("Erro de conexão.")
      return false
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteEmployee(): Promise<boolean> {
    setIsDeleting(true)
    try {
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.EMPLOYEES}/${employeeId}`, {
        method: "DELETE",
      })
      if (res.hasError) {
        Toast.error(res.message || "Erro ao excluir.")
        return false
      }
      Toast.success("Funcionário excluído.")
      if (onDeleted) {
        onDeleted()
      } else {
        router.back()
      }
      return true
    } catch {
      Toast.error("Erro de conexão.")
      return false
    } finally {
      setIsDeleting(false)
    }
  }

  return {
    employee,
    services,
    form,
    setForm,
    isLoading: isLoadingEmp,
    isSaving,
    isDeleting,
    isUploadingPhoto,
    isNew,
    toggleSpecialty,
    handlePhotoUpload,
    saveEmployee,
    deleteEmployee,
  }
}
