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

interface QuickCreateClientProps {
  onSuccess: (clientId: string) => void
}

export function QuickCreateClient({ onSuccess }: QuickCreateClientProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [countryCode, setCountryCode] = useState("BR")
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

      const res = await secureApiCall<any>(API_CONFIG.ENDPOINTS.CLIENTS, {
        method: "POST",
        body: JSON.stringify({
          ...form,
          phone: phoneForApi
        }),
      })

      if (res.hasError) {
        toast.error(res.message || "Erro ao cadastrar cliente.")
        return
      }

      toast.success("Cliente cadastrado com sucesso!")
      onSuccess(res.data.id)
      setOpen(false)
      // Clear form
      setForm({ name: "", phone: "", email: "", notes: "" })
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-4">
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
            <div className="flex gap-2">
              <div className="w-[120px] shrink-0">
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

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cadastrar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
