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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import useSWR from "swr"
import { API_CONFIG, secureApiCall, getAuthToken } from "@/lib/api"
import { refreshTenantTheme } from "@/contexts/tenant-theme.context"
import { AuthGuard } from "@/components/auth/auth.guard"

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

export default function ConfiguracoesPage() {
  const { theme, setTheme } = useTheme()
  const { data: tenant, isLoading, mutate } = useSWR(API_CONFIG.ENDPOINTS.TENANT_ME, fetcher)
  const [saving, setSaving] = useState(false)
  const [exportingClients, setExportingClients] = useState(false)
  const [exportingServices, setExportingServices] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [currentRadius, setCurrentRadius] = useState("0.625rem")

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
      setForm({
        name: tenant.name ?? "",
        slug: tenant.slug ?? "",
        logoUrl: tenant.logoUrl ?? "",
        primaryColor: tenant.primaryColor ?? "#8B4513",
        secondaryColor: tenant.secondaryColor ?? "#A0522D",
        contactPhone: tenant.contactPhone ?? "",
        contactEmail: tenant.contactEmail ?? "",
      })
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
      const res = await secureApiCall(API_CONFIG.ENDPOINTS.TENANT_ME, {
        method: "PUT",
        body: JSON.stringify(formData),
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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Configurações</h1>

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
                <div className="flex flex-col gap-2">
                  <Label htmlFor="tenant-logo">URL do Logotipo</Label>
                  <Input
                    id="tenant-logo"
                    type="url"
                    placeholder="https://exemplo.com/logo.png"
                    value={formData.logoUrl}
                    onChange={(e) => setForm((p) => p ? { ...p, logoUrl: e.target.value } : null)}
                  />
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
                  <Input
                    id="contact-phone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={formData.contactPhone}
                    onChange={(e) => setForm((p) => p ? { ...p, contactPhone: e.target.value } : null)}
                  />
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
      </div>
    </AuthGuard>
  )
}
