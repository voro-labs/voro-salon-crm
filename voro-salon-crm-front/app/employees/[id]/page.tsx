"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Save, Trash2, Camera, Upload, Image as ImageIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import useSWR from "swr"

import { API_CONFIG, secureApiCall, getAuthToken } from "@/lib/api"
import { AuthGuard } from "@/components/auth/auth.guard"

function AuthenticatedImage({ src, alt, className }: { src: string, alt: string, className?: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!src) {
      setBlobUrl(null)
      setLoading(false)
      return
    }

    if (!src.includes("blob.vercel-storage.com")) {
      setBlobUrl(src)
      setLoading(false)
      return
    }

    if (src.startsWith("data:") || src.startsWith("blob:")) {
      setBlobUrl(src)
      setLoading(false)
      return
    }

    let isMounted = true
    const fetchSignedUrl = async () => {
      setLoading(true)
      try {
        const proxyUrl = `/api/blob/proxy?url=${encodeURIComponent(src)}`
        const response = await fetch(proxyUrl)
        if (!response.ok) throw new Error("Failed to fetch signed URL via proxy")
        const data = await response.json()
        if (isMounted) setBlobUrl(data.url)
      } catch (err) {
        console.error("Error fetching signed URL:", err)
        if (isMounted) setBlobUrl(null)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchSignedUrl()
    return () => { isMounted = false }
  }, [src])

  if (loading) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted/30`}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!blobUrl) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted/30`}>
        <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
      </div>
    )
  }

  return <img src={blobUrl} alt={alt} className={className} />
}

export default function EmployeeDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const isNew = id === "new"

  const { data: employee, isLoading: isLoadingEmp } = useSWR(
    !isNew ? `${API_CONFIG.ENDPOINTS.EMPLOYEES}/${id}` : null,
    async (url) => {
      const res = await secureApiCall<any>(url, { method: "GET" })
      return res.data
    }
  )

  const { data: services } = useSWR(API_CONFIG.ENDPOINTS.SERVICES, async (url) => {
    const res = await secureApiCall<any[]>(url, { method: "GET" })
    return res.data || []
  })

  const [form, setForm] = useState({
    name: "",
    photoUrl: "",
    hireDate: new Date().toISOString().split("T")[0],
    isActive: true,
    specialtyIds: [] as string[]
  })

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  useEffect(() => {
    if (employee) {
      setForm({
        name: employee.name,
        photoUrl: employee.photoUrl || "",
        hireDate: new Date(employee.hireDate).toISOString().split("T")[0],
        isActive: employee.isActive,
        specialtyIds: employee.specialtyIds || []
      })
    }
  }, [employee])

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!isNew) {
      setUploadingPhoto(true)
      try {
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EMPLOYEES}/${id}/photo`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
          body: formData,
        })

        const res = await response.json()
        if (!response.ok || res.hasError) {
          toast.error(res.message || "Erro ao fazer upload da foto.")
          return
        }

        toast.success("Foto atualizada!")
        setForm(p => ({ ...p, photoUrl: res.data }))
      } catch {
        toast.error("Erro de conexão ao enviar foto.")
      } finally {
        setUploadingPhoto(false)
      }
    } else {
      const reader = new FileReader()
      reader.onloadend = () => {
        setForm(p => ({ ...p, photoUrl: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error("Nome é obrigatório.")
      return
    }

    setSaving(true)
    try {
      const endpoint = isNew ? API_CONFIG.ENDPOINTS.EMPLOYEES : `${API_CONFIG.ENDPOINTS.EMPLOYEES}/${id}`
      const method = isNew ? "POST" : "PUT"

      const res = await secureApiCall<any>(endpoint, {
        method,
        body: JSON.stringify(form)
      })

      if (res.hasError) {
        toast.error(res.message || "Erro ao salvar funcionário.")
        return
      }

      const savedEmployee = res.data

      if (isNew && form.photoUrl.startsWith("data:")) {
        try {
          const blob = await (await fetch(form.photoUrl)).blob()
          const file = new File([blob], "photo.jpg", { type: "image/jpeg" })
          const formData = new FormData()
          formData.append("file", file)

          await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EMPLOYEES}/${savedEmployee.id}/photo`, {
            method: "POST",
            headers: { Authorization: `Bearer ${getAuthToken()}` },
            body: formData,
          })
        } catch (err) {
          console.error("Erro no upload pós-criacao:", err)
        }
      }

      toast.success(isNew ? "Funcionário cadastrado!" : "Dados atualizados!")
      router.push("/employees")
    } catch {
      toast.error("Erro de conexão.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm("Deseja realmente excluir este funcionário?")) return
    setDeleting(true)
    try {
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.EMPLOYEES}/${id}`, { method: "DELETE" })
      if (res.hasError) {
        toast.error(res.message || "Erro ao excluir.")
        return
      }
      toast.success("Funcionário excluído.")
      router.push("/employees")
    } catch {
      toast.error("Erro de conexão.")
    } finally {
      setDeleting(false)
    }
  }

  const toggleSpecialty = (serviceId: string) => {
    setForm(p => ({
      ...p,
      specialtyIds: p.specialtyIds.includes(serviceId)
        ? p.specialtyIds.filter(sid => sid !== serviceId)
        : [...p.specialtyIds, serviceId]
    }))
  }

  if (!isNew && isLoadingEmp) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="animate-spin" /></div>
  }

  return (
    <AuthGuard requiredRoles={["User"]}>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/employees">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {isNew ? "Novo Funcionário" : "Editar Funcionário"}
            </h1>
          </div>
          {!isNew && (
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">Excluir</span>
            </Button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Dados Principais</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    placeholder="Nome do funcionário"
                    value={form.name}
                    onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="hireDate">Data de Contratação</Label>
                    <Input
                      id="hireDate"
                      type="date"
                      value={form.hireDate}
                      onChange={(e) => setForm(p => ({ ...p, hireDate: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-8">
                    <Checkbox
                      id="isActive"
                      checked={form.isActive}
                      onCheckedChange={(v) => setForm(p => ({ ...p, isActive: !!v }))}
                    />
                    <Label htmlFor="isActive" className="cursor-pointer">Funcionário Ativo</Label>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Foto do Funcionário</Label>
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-primary/20 bg-muted">
                      <AuthenticatedImage src={form.photoUrl} alt="Foto" className="h-full w-full object-cover" />
                      {uploadingPhoto && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <Loader2 className="h-5 w-5 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => document.getElementById("photo-upload")?.click()}
                          disabled={uploadingPhoto}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          {form.photoUrl ? "Alterar Foto" : "Enviar Foto"}
                        </Button>
                        {form.photoUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="px-2 text-destructive hover:bg-destructive/10"
                            onClick={() => setForm(p => ({ ...p, photoUrl: "" }))}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        JPG, PNG ou GIF. Máximo de 5MB.
                      </p>
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Especialidades</CardTitle>
                <p className="text-sm text-muted-foreground">Selecione quais serviços este funcionário realiza</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {services?.map(service => (
                    <div key={service.id} className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted/30 transition-colors">
                      <Checkbox
                        id={`svc-${service.id}`}
                        checked={form.specialtyIds.includes(service.id)}
                        onCheckedChange={() => toggleSpecialty(service.id)}
                      />
                      <Label htmlFor={`svc-${service.id}`} className="flex-1 cursor-pointer text-sm truncate">
                        {service.name}
                      </Label>
                    </div>
                  ))}
                  {services?.length === 0 && <p className="text-sm text-muted-foreground italic">Nenhum serviço cadastrado.</p>}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar Funcionário
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/employees">Cancelar</Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4 py-8">
                <div className="h-32 w-32 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-primary/20">
                  {form.photoUrl ? (
                    <AuthenticatedImage src={form.photoUrl} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-12 w-12 text-muted-foreground/30" />
                  )}
                </div>
                <div className="text-center">
                  <h4 className="font-bold text-lg">{form.name || "Nome do Funcionário"}</h4>
                  <p className="text-xs text-muted-foreground">
                    {form.isActive ? "Ativo" : "Inativo"}
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-1 mt-2">
                  {form.specialtyIds.slice(0, 5).map(sid => (
                    <Badge key={sid} variant="secondary" className="text-[10px]">
                      {services?.find(s => s.id === sid)?.name}
                    </Badge>
                  ))}
                  {form.specialtyIds.length > 5 && <Badge variant="secondary" className="text-[10px]">+{form.specialtyIds.length - 5}</Badge>}
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </AuthGuard>
  )
}
