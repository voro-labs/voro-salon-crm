"use client"

import { useState, useEffect } from "react"
import { Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PhoneInput } from "@/components/ui/custom/phone-input"
import { CountrySelector } from "@/components/ui/custom/country-selector"
import { flags } from "@/lib/flag-utils"
import { toast } from "sonner"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import { Switch } from "@/components/ui/switch"
import { AnamnesisForm } from "@/components/anamnesis/anamnesis-form"
import { ScrollArea } from "@/components/ui/scroll-area"
import useSWR from "swr"

interface QuickCreateClientProps {
  onSuccess: (clientId: string) => void
  initialName?: string
  externalOpen?: boolean
  onExternalOpenChange?: (open: boolean) => void
}

const fetcher = async (url: string) => {
  const result = await secureApiCall<any>(url, { method: "GET" })
  if (result.hasError) throw new Error(result.message || "Error")
  return result.data
}

export function QuickCreateClient({ onSuccess, initialName, externalOpen, onExternalOpenChange }: QuickCreateClientProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen || internalOpen
  const setOpen = (val: boolean) => {
    setInternalOpen(val)
    onExternalOpenChange?.(val)
  }
  const [loading, setLoading] = useState(false)
  const [countryCode, setCountryCode] = useState("BR")
  const [showAnamnesis, setShowAnamnesis] = useState(false)
  const [anamnesisResponses, setAnamnesisResponses] = useState<any[]>([])
  const [duplicateFound, setDuplicateFound] = useState<{ id: string; name: string } | null>(null)
  const [form, setForm] = useState({
    name: initialName ?? "",
    phone: "",
    email: "",
    notes: "",
  })

  useEffect(() => {
    if (initialName) setForm(p => ({ ...p, name: initialName }))
  }, [initialName])

  const { data: _clientsRaw } = useSWR(API_CONFIG.ENDPOINTS.CLIENTS + "?pageSize=500", fetcher)
  const existingClients = _clientsRaw?.items ?? (Array.isArray(_clientsRaw) ? _clientsRaw : []) ?? []

  async function performCreate() {
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

      const res = await secureApiCall<any>(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      })

      if (res.hasError) {
        toast.error(res.message || "Erro ao cadastrar cliente.")
        return
      }

      toast.success(showAnamnesis ? "Cliente e Anamnese cadastrados!" : "Cliente cadastrado com sucesso!")
      onSuccess(res.data.id)
      setOpen(false)
      setForm({ name: "", phone: "", email: "", notes: "" })
      setAnamnesisResponses([])
      setShowAnamnesis(false)
    } catch {
      toast.error("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!form.name.trim()) {
      toast.error("Nome é obrigatório.")
      return
    }
    if (!form.phone.trim()) {
      toast.error("Telefone é obrigatório.")
      return
    }

    const nameLower = form.name.trim().toLowerCase()
    const match = existingClients.find((c: any) => c.name?.trim().toLowerCase() === nameLower)
    if (match) {
      setDuplicateFound({ id: match.id, name: match.name })
      return
    }

    await performCreate()
  }

  async function handleForceCreate() {
    setDuplicateFound(null)
    await performCreate()
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) setDuplicateFound(null) }}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-5 w-5 rounded-full hover:bg-primary/10 hover:text-primary">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-125 p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 pb-2 border-b">
          <DialogTitle>Novo Cliente</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="flex flex-col gap-4 pb-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="quick-client-name">Nome *</Label>
                <Input
                  id="quick-client-name"
                  placeholder="Nome completo"
                  value={form.name}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, name: e.target.value }))
                    setDuplicateFound(null)
                  }}
                  required
                />
                {duplicateFound !== null && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 flex flex-col gap-2">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Já existe um cliente com nome similar: <strong>{duplicateFound.name}</strong>
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-amber-400 text-amber-800 hover:bg-amber-100"
                        onClick={() => {
                          onSuccess(duplicateFound.id)
                          setOpen(false)
                          setDuplicateFound(null)
                          setForm({ name: "", phone: "", email: "", notes: "" })
                          setAnamnesisResponses([])
                          setShowAnamnesis(false)
                        }}
                      >
                        Usar {duplicateFound.name}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={handleForceCreate}
                      >
                        Criar mesmo assim
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="quick-client-phone">Telefone *</Label>
                <div className="flex flex-row gap-2">
                  <div className="shrink-0">
                    <CountrySelector
                      value={countryCode}
                      onChange={setCountryCode}
                    />
                  </div>
                  <div className="flex-1">
                    <PhoneInput
                      id="quick-client-phone"
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
                <Label htmlFor="quick-client-email">Email</Label>
                <Input
                  id="quick-client-email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="quick-client-notes">Observações</Label>
                <Textarea
                  id="quick-client-notes"
                  placeholder="Anotações..."
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>

              <div className="flex items-center space-x-2 py-2">
                <Switch
                  id="show-anamnesis"
                  checked={showAnamnesis}
                  onCheckedChange={setShowAnamnesis}
                />
                <Label htmlFor="show-anamnesis" className="cursor-pointer">Adicionar Anamnese agora?</Label>
              </div>

              {showAnamnesis && (
                <div className="border rounded-lg p-3 bg-muted/20">
                  <AnamnesisForm onChange={setAnamnesisResponses} />
                </div>
              )}
            </div>
          </div>

          <div className="p-6 pt-4 border-t bg-muted/5 mt-auto">
            <div className="flex flex-row justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-10 px-6">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="h-10 px-6">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {showAnamnesis ? "Cadastrar com Anamnese" : "Cadastrar Cliente"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
