"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PhoneInput } from "@/components/ui/custom/phone-input"
import { CountrySelector } from "@/components/ui/custom/country-selector"
import { flags } from "@/lib/flag-utils"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { AnamnesisForm } from "@/components/anamnesis/anamnesis-form"

import { API_CONFIG, secureApiCall } from "@/lib/api"
import { AuthGuard } from "@/components/auth/auth.guard"

export default function NovoClientePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [countryCode, setCountryCode] = useState("BR")
  const [showAnamnesis, setShowAnamnesis] = useState(false)
  const [anamnesisResponses, setAnamnesisResponses] = useState<any[]>([])
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Nome e telefone sao obrigatorios.")
      return
    }
    setLoading(true)
    try {
      const dialCode = flags[countryCode]?.dialCodeOnlyNumber || ""
      const phoneForApi = `${dialCode}${form.phone}`

      let endpoint = API_CONFIG.ENDPOINTS.CLIENTS
      let body: any = {
        ...form,
        phone: phoneForApi
      }

      if (showAnamnesis && anamnesisResponses.length > 0) {
        endpoint = `${API_CONFIG.ENDPOINTS.ANAMNESIS}/with-client`
        body = {
          client: body,
          anamnesis: {
            date: new Date().toISOString(),
            professionalId: "00000000-0000-0000-0000-000000000000",
            responses: anamnesisResponses,
            signatures: []
          }
        }
      }

      const res = await secureApiCall(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      })
      if (res.hasError) {
        toast.error(res.message || "Erro ao cadastrar cliente.")
        return
      }
      toast.success(showAnamnesis ? "Cliente e Anamnese cadastrados!" : "Cliente cadastrado com sucesso!")
      router.push("/clients")
      router.refresh()
    } catch {
      toast.error("Erro de conexao. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthGuard requiredRoles={["User"]}>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/clients">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Novo Cliente</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Dados do Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Nome completo"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">Telefone *</Label>
                <div className="flex gap-2">
                  <div className="w-[120px] shrink-0">
                    <CountrySelector
                      value={countryCode}
                      onChange={setCountryCode}
                    />
                  </div>
                  <div className="flex-1">
                    <PhoneInput
                      id="phone"
                      value={form.phone}
                      autoComplete="tel"
                      onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
                      countryCode={countryCode}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="notes">Observacoes</Label>
                <Textarea
                  id="notes"
                  placeholder="Anotacoes sobre o cliente..."
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>

              <div className="flex items-center space-x-2 py-4 border-t mt-2">
                <Switch
                  id="show-anamnesis"
                  checked={showAnamnesis}
                  onCheckedChange={setShowAnamnesis}
                />
                <Label htmlFor="show-anamnesis" className="cursor-pointer font-semibold">Iniciar Anamnese Capilar agora?</Label>
              </div>

              {showAnamnesis && (
                <div className="border rounded-xl p-6 bg-muted/30 mb-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    Ficha de Anamnese
                    <span className="text-xs font-normal text-muted-foreground bg-background px-2 py-1 rounded-full border">Opcional</span>
                  </h3>
                  <AnamnesisForm onChange={setAnamnesisResponses} />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={loading} size="lg">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {showAnamnesis ? "Cadastrar e Salvar Anamnese" : "Cadastrar Cliente"}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/dashboard/clientes">Cancelar</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  )
}
