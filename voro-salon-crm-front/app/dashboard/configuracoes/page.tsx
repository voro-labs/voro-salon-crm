"use client"

import { useState } from "react"
import useSWR, { mutate } from "swr"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function ConfiguracoesPage() {
  const { theme, setTheme } = useTheme()
  const { data, isLoading } = useSWR("/api/tenant", fetcher)
  const [saving, setSaving] = useState(false)
  const [exportingClients, setExportingClients] = useState(false)
  const [exportingServices, setExportingServices] = useState(false)

  const [form, setForm] = useState<{
    name: string
    logo_url: string
    primary_color: string
    accent_color: string
  } | null>(null)

  const tenant = data?.tenant
  const formData = form ?? {
    name: tenant?.name ?? "",
    logo_url: tenant?.logo_url ?? "",
    primary_color: tenant?.primary_color ?? "#8B4513",
    accent_color: tenant?.accent_color ?? "#A0522D",
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error("Nome do estabelecimento e obrigatorio.")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/tenant", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error || "Erro ao salvar configuracoes.")
        return
      }
      toast.success("Configuracoes salvas com sucesso!")
      mutate("/api/tenant")
      mutate("/api/auth/session")
    } catch {
      toast.error("Erro de conexao.")
    } finally {
      setSaving(false)
    }
  }

  async function handleExport(type: "clients" | "services") {
    const setter = type === "clients" ? setExportingClients : setExportingServices
    setter(true)
    try {
      const res = await fetch(`/api/export/${type}`)
      if (!res.ok) {
        toast.error("Erro ao exportar dados.")
        return
      }
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
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Configuracoes</h1>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 w-full animate-pulse rounded bg-muted" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Configuracoes</h1>

      {/* Tenant / White-label settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-foreground">Dados do Estabelecimento</CardTitle>
          </div>
          <CardDescription>
            Personalize o nome e logomarca do seu salao
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="tenant-name">Nome do Estabelecimento *</Label>
              <Input
                id="tenant-name"
                placeholder="Meu Salao"
                value={formData.name}
                onChange={(e) =>
                  setForm((p) => ({ ...formData, ...p, name: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tenant-logo">URL do Logotipo</Label>
              <Input
                id="tenant-logo"
                type="url"
                placeholder="https://exemplo.com/logo.png"
                value={formData.logo_url}
                onChange={(e) =>
                  setForm((p) => ({ ...formData, ...p, logo_url: e.target.value }))
                }
              />
            </div>

            <Separator />

            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              <span className="font-medium text-foreground">Cores do Tema</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="primary-color">Cor Primaria</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="primary-color"
                    value={formData.primary_color}
                    onChange={(e) =>
                      setForm((p) => ({ ...formData, ...p, primary_color: e.target.value }))
                    }
                    className="h-10 w-10 cursor-pointer rounded border border-border"
                  />
                  <Input
                    value={formData.primary_color}
                    onChange={(e) =>
                      setForm((p) => ({ ...formData, ...p, primary_color: e.target.value }))
                    }
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="accent-color">Cor de Destaque</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="accent-color"
                    value={formData.accent_color}
                    onChange={(e) =>
                      setForm((p) => ({ ...formData, ...p, accent_color: e.target.value }))
                    }
                    className="h-10 w-10 cursor-pointer rounded border border-border"
                  />
                  <Input
                    value={formData.accent_color}
                    onChange={(e) =>
                      setForm((p) => ({ ...formData, ...p, accent_color: e.target.value }))
                    }
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <Button type="submit" disabled={saving} className="w-fit">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Salvar Configuracoes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Theme toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-primary" />
            <CardTitle className="text-foreground">Aparencia</CardTitle>
          </div>
          <CardDescription>Escolha o modo claro, escuro ou automatico</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("light")}
            >
              <Sun className="mr-2 h-4 w-4" />
              Claro
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("dark")}
            >
              <Moon className="mr-2 h-4 w-4" />
              Escuro
            </Button>
            <Button
              variant={theme === "system" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("system")}
            >
              <Monitor className="mr-2 h-4 w-4" />
              Sistema
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            <CardTitle className="text-foreground">Exportar Dados</CardTitle>
          </div>
          <CardDescription>
            Exporte seus dados em formato CSV para planilhas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("clients")}
              disabled={exportingClients}
            >
              {exportingClients ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Exportar Clientes
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("services")}
              disabled={exportingServices}
            >
              {exportingServices ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Exportar Servicos
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
