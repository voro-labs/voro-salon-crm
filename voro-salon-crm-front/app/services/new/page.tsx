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
import { CurrencyInput } from "@/components/currency-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

import { API_CONFIG, secureApiCall } from "@/lib/api"
import { AuthGuard } from "@/components/auth/auth.guard"

export default function NovoServicoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: 0,
    durationMinutes: 30,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error("O nome do serviço é obrigatório.")
      return
    }
    setLoading(true)
    try {
      const res = await secureApiCall(API_CONFIG.ENDPOINTS.SERVICES, {
        method: "POST",
        body: JSON.stringify(form),
      })
      if (res.hasError) {
        toast.error(res.message || "Erro ao cadastrar serviço.")
        return
      }
      toast.success("Serviço cadastrado com sucesso!")
      router.push("/services")
      router.refresh()
    } catch {
      toast.error("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthGuard requiredRoles={["User"]}>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/services">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Novo Serviço</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Dados do Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Nome do serviço (ex: Corte Masculino)"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="price">Preço Padrão (R$)</Label>
                <CurrencyInput
                  id="price"
                  value={form.price}
                  onChange={(v) => setForm((p) => ({ ...p, price: v }))}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="durationMinutes">Duração Estimada</Label>
                <Select
                  key={form.durationMinutes}
                  value={form.durationMinutes.toString()}
                  onValueChange={(v) => setForm(p => ({ ...p, durationMinutes: parseInt(v) }))}
                >
                  <SelectTrigger id="durationMinutes" className="w-full">
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
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descrição opcional do serviço..."
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Cadastrar
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/services">Cancelar</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  )
}
