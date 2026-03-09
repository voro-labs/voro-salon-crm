"use client"

import { useState, useEffect, useCallback } from "react"
import { useTheme } from "next-themes"
import {
  Save,
  Loader2,
  Building2,
  Palette,
  Moon,
  Sun,
  Monitor,
  Download,
  Phone,
  Mail,
  Sliders,
  Upload,
  Image as ImageIcon,
  X,
  LayoutGrid,
  ClipboardList,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import useSWR from "swr"
import { API_CONFIG, secureApiCall, getAuthToken } from "@/lib/api"
import { refreshTenantTheme } from "@/contexts/tenant-theme.context"
import { AuthGuard } from "@/components/auth/auth.guard"
import { PhoneInput } from "@/components/ui/custom/phone-input"
import { CountrySelector } from "@/components/ui/custom/country-selector"
import { flags, getCountryFromPhone } from "@/lib/flag-utils"

interface TenantData {
  id: string
  slug: string
  name: string
  logoUrl: string | null
  primaryColor: string | null
  secondaryColor: string | null
  contactPhone: string | null
  contactEmail: string | null
  themeMode: string
}

const COLOR_PRESETS = [
  { label: "Rosa Salão", primary: "#e11d48", secondary: "#f43f5e" },
  { label: "Roxo Elegante", primary: "#7c3aed", secondary: "#a855f7" },
  { label: "Marrom Clássico", primary: "#8B4513", secondary: "#A0522D" },
  { label: "Verde Esmeralda", primary: "#059669", secondary: "#10b981" },
  { label: "Azul Profissional", primary: "#1d4ed8", secondary: "#3b82f6" },
  { label: "Dourado Premium", primary: "#b45309", secondary: "#d97706" },
  { label: "Carbono", primary: "#374151", secondary: "#6b7280" },
  { label: "Coral", primary: "#dc4f2f", secondary: "#f97316" },
]

const RADIUS_PRESETS = [
  { label: "Quadrado", value: "0rem" },
  { label: "Suave", value: "0.375rem" },
  { label: "Padrão", value: "0.625rem" },
  { label: "Arredondado", value: "1rem" },
  { label: "Pill", value: "1.5rem" },
]

const fetcher = async (url: string) => {
  const result = await secureApiCall<TenantData>(url, { method: "GET" })
  if (result.hasError) throw new Error(result.message || "Failed to fetch tenant")
  return result.data
}

function applyRadius(value: string) {
  document.documentElement.style.setProperty("--radius", value)
  try { localStorage.setItem("voro:radius", value) } catch { }
}

function AuthenticatedImage({ src, alt, className }: { src: string, alt: string, className?: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!src) {
      setBlobUrl(null)
      setLoading(false)
      return
    }

    // Se não for do vercel blob, usa direto
    if (!src.includes("blob.vercel-storage.com")) {
      setBlobUrl(src)
      setLoading(false)
      return
    }

    // Se já for um data url ou blob local (preview), usa direto
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

        const data = await response.blob()
        const fileUrl = URL.createObjectURL(data)
        if (isMounted) {
          setBlobUrl(fileUrl)
        }
      } catch (err) {
        console.error("Error fetching signed URL:", err)
        if (isMounted) setBlobUrl(null)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchSignedUrl()
    return () => {
      isMounted = false
    }
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

export default function ConfiguracoesPage() {
  const { theme, setTheme } = useTheme()
  const { data: tenant, isLoading, mutate } = useSWR(API_CONFIG.ENDPOINTS.TENANT_ME, fetcher)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [exportingClients, setExportingClients] = useState(false)
  const [exportingServices, setExportingServices] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [currentRadius, setCurrentRadius] = useState("0.625rem")
  const [countryCode, setCountryCode] = useState("BR")
  const { data: modules, mutate: mutateModules } = useSWR(API_CONFIG.ENDPOINTS.TENANT_MODULES, async (url) => {
    const res = await secureApiCall<any[]>(url, { method: "GET" })
    if (res.hasError) throw new Error(res.message || "Failed to fetch modules")
    return res.data
  })

  const [form, setForm] = useState<{
    name: string
    slug: string
    logoUrl: string
    primaryColor: string
    secondaryColor: string
    contactPhone: string
    contactEmail: string
  } | null>(null)

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
      })
      setCountryCode(cCode)
    }
  }, [tenant, form])

  useEffect(() => {
    setMounted(true)
    const saved = typeof window !== "undefined" ? localStorage.getItem("voro:radius") : null
    if (saved) {
      setCurrentRadius(saved)
    }
  }, [])

  const formData = form ?? {
    name: "",
    slug: "",
    logoUrl: "",
    primaryColor: "#8B4513",
    secondaryColor: "#A0522D",
    contactPhone: "",
    contactEmail: "",
  }

  const handlePreset = useCallback((primary: string, secondary: string) => {
    setForm((p) => p ? { ...p, primaryColor: primary, secondaryColor: secondary } : null)
    refreshTenantTheme(primary, secondary)
  }, [])

  const handleRadiusChange = useCallback((value: string) => {
    setCurrentRadius(value)
    applyRadius(value)
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error("Nome do estabelecimento é obrigatório.")
      return
    }
    if (!formData.slug.trim()) {
      toast.error("Slug é obrigatório.")
      return
    }
    setSaving(true)
    try {
      const dialCode = flags[countryCode]?.dialCodeOnlyNumber || ""
      const phoneForApi = `${dialCode}${formData.contactPhone}`

      const res = await secureApiCall(API_CONFIG.ENDPOINTS.TENANT_ME, {
        method: "PATCH",
        body: JSON.stringify({
          ...formData,
          contactPhone: phoneForApi
        }),
      })
      if (res.hasError) {
        toast.error(res.message || "Erro ao salvar configurações.")
        return
      }
      toast.success("Configurações salvas com sucesso!")
      mutate()
      refreshTenantTheme(formData.primaryColor, formData.secondaryColor)
    } catch {
      toast.error("Erro de conexão.")
    } finally {
      setSaving(false)
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Preview localmente
    const reader = new FileReader()
    reader.onloadend = () => {
      setForm(p => p ? { ...p, logoUrl: reader.result as string } : null)
    }
    reader.readAsDataURL(file)

    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TENANT_ME}/logo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: formData,
      })

      const res = await response.json()
      if (!response.ok || res.hasError) {
        toast.error(res.message || "Erro ao fazer upload da logo.")
        // Reverter para o original do tenant se falhar
        setForm(p => p ? { ...p, logoUrl: tenant?.logoUrl ?? "" } : null)
        return
      }

      toast.success("Logo atualizada com sucesso!")
      setForm(p => p ? { ...p, logoUrl: res.data } : null)
      mutate()
    } catch {
      toast.error("Erro de conexão ao enviar logo.")
      setForm(p => p ? { ...p, logoUrl: tenant?.logoUrl ?? "" } : null)
    } finally {
      setUploadingLogo(false)
    }
  }

  async function handleExport(type: "clients" | "services") {
    const setter = type === "clients" ? setExportingClients : setExportingServices
    setter(true)
    try {
      const endpoint = type === "clients" ? API_CONFIG.ENDPOINTS.EXPORT_CLIENTS : API_CONFIG.ENDPOINTS.EXPORT_SERVICES
      const res = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      })
      if (!res.ok) { toast.error("Erro ao exportar dados."); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${type}-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("Arquivo exportado!")
    } catch {
      toast.error("Erro ao exportar.")
    } finally {
      setter(false)
    }
  }

  async function handleModuleUpdate(moduleId: number, isEnabled: boolean, configuration?: string) {
    try {
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.TENANT_MODULES}/${moduleId}`, {
        method: "PATCH",
        body: JSON.stringify({ isEnabled, configuration }),
      })
      if (res.hasError) {
        toast.error(res.message || "Erro ao atualizar módulo.")
        return
      }
      toast.success("Módulo atualizado!")
      mutateModules()
    } catch {
      toast.error("Erro de conexão.")
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Configurações</h1>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 w-full animate-pulse rounded bg-muted" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <AuthGuard requiredRoles={["Admin"]}>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Configurações</h1>
        </div>

        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="geral">
              <Building2 className="mr-2 h-4 w-4" />
              Estabelecimento
            </TabsTrigger>
            <TabsTrigger value="aparencia">
              <Palette className="mr-2 h-4 w-4" />
              Aparência
            </TabsTrigger>
            <TabsTrigger value="modulos">
              <LayoutGrid className="mr-2 h-4 w-4" />
              Módulos
            </TabsTrigger>
            <TabsTrigger value="exportar">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="geral">
            {/* ── Estabelecimento ── */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle>Dados do Estabelecimento</CardTitle>
                </div>
                <CardDescription>Nome, slug, logo e informações de contato do seu salão</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="tenant-name">Nome do Estabelecimento *</Label>
                      <Input
                        id="tenant-name"
                        placeholder="Meu Salão"
                        value={formData.name}
                        onChange={(e) => setForm((p) => p ? { ...p, name: e.target.value } : null)}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="tenant-slug">Slug *</Label>
                      <Input
                        id="tenant-slug"
                        placeholder="meu-salao"
                        value={formData.slug}
                        onChange={(e) => setForm((p) => p ? { ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') } : null)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex flex-col gap-4">
                      <Label>Logotipo do Estabelecimento</Label>
                      <div className="flex flex-col sm:flex-row items-start gap-4">
                        {/* Preview Section */}
                        <div className="relative group w-32 h-32 rounded-lg border-2 border-dashed border-muted flex items-center justify-center overflow-hidden bg-muted/30">
                          {formData.logoUrl ? (
                            <>
                              <AuthenticatedImage
                                src={formData.logoUrl}
                                alt="Logo preview"
                                className="w-full h-full object-contain"
                              />
                              <button
                                type="button"
                                onClick={() => setForm(p => p ? { ...p, logoUrl: "" } : null)}
                                className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </>
                          ) : (
                            <ImageIcon className="h-10 w-10 text-muted-foreground" />
                          )}
                          {uploadingLogo && (
                            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 flex flex-col gap-3 w-full">
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="tenant-logo-file" className="text-xs uppercase tracking-wider text-muted-foreground">Upload de Arquivo</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                id="tenant-logo-file"
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="hidden"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => document.getElementById('tenant-logo-file')?.click()}
                                disabled={uploadingLogo}
                                className="w-full sm:w-auto"
                              >
                                <Upload className="mr-2 h-4 w-4" />
                                {formData.logoUrl ? "Alterar Logo" : "Selecionar Logo"}
                              </Button>
                              <span className="text-xs text-muted-foreground hidden sm:inline">PNG, JPG ou SVG (Máx. 2MB)</span>
                            </div>
                          </div>

                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                              <span className="bg-card px-2 text-muted-foreground">OU</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <Label htmlFor="tenant-logo-url" className="text-xs uppercase tracking-wider text-muted-foreground">URL Externa</Label>
                            <Input
                              id="tenant-logo-url"
                              type="url"
                              placeholder="https://exemplo.com/logo.png"
                              value={formData.logoUrl}
                              onChange={(e) => setForm((p) => p ? { ...p, logoUrl: e.target.value } : null)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground text-sm">Contato</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="contact-phone">Telefone / WhatsApp</Label>
                      <div className="flex gap-2">
                        <div className="w-[120px] shrink-0">
                          <CountrySelector
                            value={countryCode}
                            onChange={setCountryCode}
                          />
                        </div>
                        <div className="flex-1 relative">
                          <PhoneInput
                            id="contact-phone"
                            value={formData.contactPhone}
                            autoComplete="tel"
                            onChange={(v) => setForm((p) => p ? { ...p, contactPhone: v } : null)}
                            countryCode={countryCode}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="contact-email">
                        <Mail className="inline h-3.5 w-3.5 mr-1 mb-0.5" />
                        E-mail de contato
                      </Label>
                      <Input
                        id="contact-email"
                        type="email"
                        placeholder="contato@meusalao.com"
                        value={formData.contactEmail}
                        onChange={(e) => setForm((p) => p ? { ...p, contactEmail: e.target.value } : null)}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* ── Cores ── */}
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground text-sm">Cores do Tema</span>
                  </div>

                  {/* Presets */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Paletas prontas</p>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_PRESETS.map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          title={p.label}
                          onClick={() => handlePreset(p.primary, p.secondary)}
                          className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs font-medium transition-all hover:border-primary hover:text-primary"
                          style={{
                            outline: formData.primaryColor === p.primary ? `2px solid ${p.primary}` : undefined,
                            outlineOffset: "2px",
                          }}
                        >
                          <span
                            className="inline-block h-3 w-3 rounded-full ring-1 ring-black/10"
                            style={{ background: p.primary }}
                          />
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom picker */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="primary-color">Cor Primária</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          id="primary-color"
                          value={formData.primaryColor}
                          onChange={(e) => {
                            const v = e.target.value
                            setForm((p) => ({ ...formData, ...p!, primaryColor: v }))
                            refreshTenantTheme(v, formData.secondaryColor)
                          }}
                          className="h-10 w-10 cursor-pointer rounded border border-border"
                        />
                        <Input
                          value={formData.primaryColor}
                          onChange={(e) => {
                            const v = e.target.value
                            setForm((p) => ({ ...formData, ...p!, primaryColor: v }))
                            if (/^#[0-9a-f]{6}$/i.test(v)) refreshTenantTheme(v, formData.secondaryColor)
                          }}
                          className="flex-1 font-mono text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="accent-color">Cor de Destaque</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          id="accent-color"
                          value={formData.secondaryColor}
                          onChange={(e) => {
                            const v = e.target.value
                            setForm((p) => ({ ...formData, ...p!, secondaryColor: v }))
                            refreshTenantTheme(formData.primaryColor, v)
                          }}
                          className="h-10 w-10 cursor-pointer rounded border border-border"
                        />
                        <Input
                          value={formData.secondaryColor}
                          onChange={(e) => {
                            const v = e.target.value
                            setForm((p) => ({ ...formData, ...p!, secondaryColor: v }))
                            if (/^#[0-9a-f]{6}$/i.test(v)) refreshTenantTheme(formData.primaryColor, v)
                          }}
                          className="flex-1 font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <Button type="submit" disabled={saving} className="w-fit">
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Configurações
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="aparencia">
            {/* ── Aparência ── */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sun className="h-5 w-5 text-primary" />
                  <CardTitle>Aparência</CardTitle>
                </div>
                <CardDescription>Modo de exibição e arredondamento dos elementos</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                {/* Theme mode */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Modo de cor</p>
                  <div className="flex flex-wrap gap-3">
                    {mounted ? (
                      <>
                        <Button variant={theme === "light" ? "default" : "outline"} size="sm" onClick={() => setTheme("light")}>
                          <Sun className="mr-2 h-4 w-4" />Claro
                        </Button>
                        <Button variant={theme === "dark" ? "default" : "outline"} size="sm" onClick={() => setTheme("dark")}>
                          <Moon className="mr-2 h-4 w-4" />Escuro
                        </Button>
                        <Button variant={theme === "system" ? "default" : "outline"} size="sm" onClick={() => setTheme("system")}>
                          <Monitor className="mr-2 h-4 w-4" />Sistema
                        </Button>
                      </>
                    ) : (
                      <div className="flex gap-3">
                        <div className="h-9 w-[88px] animate-pulse rounded bg-muted" />
                        <div className="h-9 w-[96px] animate-pulse rounded bg-muted" />
                        <div className="h-9 w-[104px] animate-pulse rounded bg-muted" />
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Border radius */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sliders className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">Arredondamento de bordas</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {RADIUS_PRESETS.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => handleRadiusChange(r.value)}
                        className={`px-3 py-1.5 text-xs font-medium border rounded-lg transition-all ${currentRadius === r.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-foreground hover:border-primary"
                          }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  {/* Live preview */}
                  <div className="mt-3 flex items-center gap-3">
                    <div
                      className="h-8 w-20 bg-primary opacity-90 transition-all"
                      style={{ borderRadius: `var(--radius)` }}
                    />
                    <div
                      className="h-8 w-20 border-2 border-primary transition-all"
                      style={{ borderRadius: `var(--radius)` }}
                    />
                    <span className="text-xs text-muted-foreground">Pré-visualização</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="modulos">
            {/* ── Módulos ── */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5 text-primary" />
                  <CardTitle>Módulos do Sistema</CardTitle>
                </div>
                <CardDescription>Ative ou desative funcionalidades e personalize nomes</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                {modules?.map((mod) => {
                  let configParsed = { displayName: "" };
                  try {
                    if (mod.configuration) configParsed = JSON.parse(mod.configuration);
                  } catch { }

                  const moduleNames: Record<number, string> = {
                    1: "Clientes",
                    2: "Agendamentos",
                    3: "Serviços",
                    4: "Funcionários"
                  };

                  return (
                    <div key={mod.module} className="flex flex-col gap-4 p-4 rounded-lg border border-border bg-muted/20">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-foreground">
                            {moduleNames[mod.module] || `Módulo ${mod.module}`}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {mod.isEnabled ? "Ativado" : "Desativado"}
                          </span>
                        </div>
                        <Switch
                          checked={mod.isEnabled}
                          onCheckedChange={(checked) => handleModuleUpdate(mod.module, checked, mod.configuration)}
                        />
                      </div>

                      {mod.isEnabled && (
                        <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                          <Label htmlFor={`display-name-${mod.module}`} className="text-xs">Nome de Exibição personalizado</Label>
                          <div className="flex gap-2">
                            <Input
                              id={`display-name-${mod.module}`}
                              placeholder={moduleNames[mod.module]}
                              defaultValue={configParsed.displayName}
                              className="h-8 text-sm"
                              onBlur={(e) => {
                                if (e.target.value === configParsed.displayName) return;
                                const newConfig = JSON.stringify({ ...configParsed, displayName: e.target.value });
                                handleModuleUpdate(mod.module, mod.isEnabled, newConfig);
                              }}
                            />
                            <Button variant="ghost" size="sm" className="h-8 px-2">
                              <Save className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exportar">
            {/* ── Exportar ── */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-primary" />
                  <CardTitle>Exportar Dados</CardTitle>
                </div>
                <CardDescription>Exporte seus dados em formato CSV para planilhas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" size="sm" onClick={() => handleExport("clients")} disabled={exportingClients}>
                    {exportingClients ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Exportar Clientes
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExport("services")} disabled={exportingServices}>
                    {exportingServices ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Exportar Serviços
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AuthGuard>
  )
}
