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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CurrencyInput } from "@/components/ui/custom/currency-input"
import { toast } from "sonner"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import useSWR from "swr"

interface QuickCreateServiceProps {
  onSuccess: (serviceId: string, serviceData: any) => void
}

const fetcher = async (url: string) => {
  const result = await secureApiCall<any>(url, { method: "GET" })
  if (result.hasError) throw new Error(result.message || "Error")
  return result.data
}

export function QuickCreateService({ onSuccess }: QuickCreateServiceProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [duplicateFound, setDuplicateFound] = useState<{ id: string; name: string } | null>(null)
  const [form, setForm] = useState({
    name: "",
    category: "",
    description: "",
    price: 0,
    durationMinutes: 30,
  })

  const { data: _svcRaw } = useSWR(API_CONFIG.ENDPOINTS.SERVICES + "?pageSize=500", fetcher)
  const existingServices = _svcRaw?.items ?? (Array.isArray(_svcRaw) ? _svcRaw : []) ?? []

  async function performCreate() {
    setLoading(true)
    try {
      const res = await secureApiCall<any>(API_CONFIG.ENDPOINTS.SERVICES, {
        method: "POST",
        body: JSON.stringify(form),
      })

      if (res.hasError) {
        toast.error(res.message || "Erro ao cadastrar serviço.")
        return
      }

      toast.success("Serviço cadastrado com sucesso!")
      onSuccess(res.data.id, res.data)
      setOpen(false)
      setForm({ name: "", category: "", description: "", price: 0, durationMinutes: 30 })
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
      toast.error("O nome do serviço é obrigatório.")
      return
    }

    const nameLower = form.name.trim().toLowerCase()
    const match = existingServices.find((s: any) => s.name?.trim().toLowerCase() === nameLower)
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
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Novo Serviço</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="quick-service-name">Nome *</Label>
            <Input
              id="quick-service-name"
              placeholder="Nome do serviço"
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
                  Já existe um serviço com nome similar: <strong>{duplicateFound.name}</strong>
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-amber-400 text-amber-800 hover:bg-amber-100"
                    onClick={() => {
                      onSuccess(duplicateFound.id, existingServices.find((s: any) => s.id === duplicateFound.id))
                      setOpen(false)
                      setDuplicateFound(null)
                      setForm({ name: "", category: "", description: "", price: 0, durationMinutes: 30 })
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
            <Label htmlFor="quick-service-category">Categoria</Label>
            <Input
              id="quick-service-category"
              placeholder="Ex: Corte, Coloração, Tratamento..."
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="quick-service-price">Preço Padrão (R$)</Label>
            <CurrencyInput
              id="quick-service-price"
              value={form.price}
              onChange={(v) => setForm((p) => ({ ...p, price: v }))}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="quick-service-duration">Duração Estimada</Label>
            <Select
              key={form.durationMinutes}
              value={form.durationMinutes.toString()}
              onValueChange={(v) => setForm(p => ({ ...p, durationMinutes: parseInt(v) }))}
            >
              <SelectTrigger id="quick-service-duration" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 min</SelectItem>
                <SelectItem value="30">30 min</SelectItem>
                <SelectItem value="45">45 min</SelectItem>
                <SelectItem value="60">1 hora</SelectItem>
                <SelectItem value="90">1h 30min</SelectItem>
                <SelectItem value="120">2 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="quick-service-description">Descrição</Label>
            <Textarea
              id="quick-service-description"
              placeholder="Descrição opcional..."
              rows={2}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
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
