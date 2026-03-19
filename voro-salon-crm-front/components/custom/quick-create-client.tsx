"use client"

import { useState } from "react"
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

interface QuickCreateClientProps {
  onSuccess: (clientId: string) => void
}

export function QuickCreateClient({ onSuccess }: QuickCreateClientProps) {
  const [open, setOpen] = useState(false)
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
    e.stopPropagation()
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Nome e telefone são obrigatórios.")
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
            professionalId: "00000000-0000-0000-0000-000000000000", // Will be handled by service if 0 or empty for now
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
      // Clear form
      setForm({ name: "", phone: "", email: "", notes: "" })
      setAnamnesisResponses([])
      setShowAnamnesis(false)
    } catch {
      toast.error("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-5 w-5 rounded-full hover:bg-primary/10 hover:text-primary">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden flex flex-col max-h-[90vh]">
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
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
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
