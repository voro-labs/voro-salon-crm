"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
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
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { refreshTenantTheme } from "@/contexts/tenant-theme.context"
import { AuthGuard } from "@/components/auth/auth.guard"
import { useAuth } from "@/contexts/auth.context"
import { useSettings } from "@/hooks/use-settings.hook"
import { PhoneInput } from "@/components/ui/custom/phone-input"
import { CountrySelector } from "@/components/ui/custom/country-selector"

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
  const [mounted, setMounted] = useState(false)
  const [currentRadius, setCurrentRadius] = useState("0.625rem")
  const { user } = useAuth()

  const roleNames = user?.roles?.map((r) => r.name) ?? []
  const isOwner = roleNames.includes("Owner")
  const isSalonOwner = roleNames.includes("SalonOwner") || isOwner
  const defaultTab = isOwner ? "geral" : isSalonOwner ? "exportar" : "aparencia"

  const {
    modules,
    form,
    setForm,
    formData,
    countryCode,
    setCountryCode,
    isLoading,
    isSaving: saving,
    isUploadingLogo: uploadingLogo,
    isExportingClients: exportingClients,
    isExportingServices: exportingServices,
    handlePreset,
    saveTenant,
    handleLogoUpload,
    exportData: handleExport,
    updateModule: handleModuleUpdate,
  } = useSettings()

  useEffect(() => {
    setMounted(true)
    const saved = typeof window !== "undefined" ? localStorage.getItem("voro:radius") : null
    if (saved) setCurrentRadius(saved)
  }, [])

  const handleRadiusChange = useCallback((value: string) => {
    setCurrentRadius(value)
    applyRadius(value)
  }, [])


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
    <AuthGuard requiredRoles={["Owner", "SalonOwner"]}>
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground text-balance">Configurações</h1>
        </div>

        <Tabs defaultValue={defaultTab} className="w-full">
          <div className="relative overflow-hidden">
            <TabsList className="w-full justify-start overflow-x-auto no-scrollbar flex-nowrap h-auto p-1 bg-muted/50">
              {isOwner && (
                <TabsTrigger value="geral" className="shrink-0 py-2">
                  <Building2 className="mr-2 h-4 w-4" />
                  Estabelecimento
                </TabsTrigger>
              )}
              <TabsTrigger value="aparencia" className="shrink-0 py-2">
                <Palette className="mr-2 h-4 w-4" />
                Aparência
              </TabsTrigger>
              {isOwner && (
                <TabsTrigger value="modulos" className="shrink-0 py-2">
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  Módulos
                </TabsTrigger>
              )}
              {isSalonOwner && (
                <TabsTrigger value="exportar" className="shrink-0 py-2">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </TabsTrigger>
              )}
              {isOwner && (
                <TabsTrigger value="anamnesis" className="shrink-0 py-2">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Anamnese
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {isOwner && <TabsContent value="geral">
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
                <form onSubmit={(e) => { e.preventDefault(); saveTenant(formData) }} className="flex flex-col gap-5">
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
          </TabsContent>}

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

          {isOwner && <TabsContent value="modulos">
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
                    4: "Funcionários",
                    5: "Financeiros",
                    6: "Relatórios",
                    7: "Configurações"
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
          </TabsContent>}

          {isSalonOwner && <TabsContent value="exportar">
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
          </TabsContent>}

          {isOwner && <TabsContent value="anamnesis">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  <CardTitle>Configurar Anamnese</CardTitle>
                </div>
                <CardDescription>Gerencie as perguntas e seções da ficha de avaliação capilar</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <div className="p-4 rounded-lg border border-border bg-muted/20 flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-foreground">Gerenciar Perguntas</span>
                    <span className="text-sm text-muted-foreground text-balance">Personalize sua ficha de anamnese para atender melhor seus clientes</span>
                  </div>
                  <Button asChild>
                    <Link href="/settings/anamnesis">
                      Abrir Editor
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>}
        </Tabs>
      </div>
    </AuthGuard>
  )
}
