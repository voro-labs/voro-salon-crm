"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Calendar as CalendarIcon, User, Scissors } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CurrencyInput } from "@/components/currency-input"
import { toast } from "sonner"
import useSWR from "swr"

import { API_CONFIG, secureApiCall } from "@/lib/api"
import { AuthGuard } from "@/components/auth/auth.guard"

const fetcher = async (url: string) => {
  const result = await secureApiCall<any>(url, { method: "GET" })
  if (result.hasError) throw new Error(result.message || "Error")
  return result.data
}

export default function NovoAgendamentoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Fetch data for dropdowns
  const { data: clients } = useSWR(API_CONFIG.ENDPOINTS.CLIENTS, fetcher)
  const { data: services } = useSWR(API_CONFIG.ENDPOINTS.SERVICES, fetcher)

  const [form, setForm] = useState({
    clientId: "",
    serviceId: "",
    scheduledDateTime: "",
    durationMinutes: 30,
    description: "",
    amount: 0,
    notes: ""
  })

  // Set default date/time to now (rounded to next 30 min)
  useEffect(() => {
    const now = new Date()
    now.setMinutes(Math.ceil(now.getMinutes() / 30) * 30)
    now.setSeconds(0)
    now.setMilliseconds(0)

    // Format for datetime-local input (YYYY-MM-DDTHH:mm)
    const tzOffset = now.getTimezoneOffset() * 60000
    const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16)

    setForm(p => ({ ...p, scheduledDateTime: localISOTime }))
  }, [])

  // Update amount when service changes
  function handleServiceChange(serviceId: string) {
    const selectedService = services?.find((s: any) => s.id === serviceId)
    setForm(p => ({
      ...p,
      serviceId,
      amount: selectedService?.price ?? p.amount,
      description: p.description || selectedService?.name || ""
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.clientId) {
      toast.error("Selecione um cliente.")
      return
    }
    if (!form.scheduledDateTime) {
      toast.error("Selecione a data e hora.")
      return
    }

    setLoading(true)
    try {
      // Convert local time string to ISO with offset properly handled by API
      const date = new Date(form.scheduledDateTime)

      const res = await secureApiCall(API_CONFIG.ENDPOINTS.APPOINTMENTS, {
        method: "POST",
        body: JSON.stringify({
          ...form,
          scheduledDateTime: date.toISOString(),
          serviceId: form.serviceId || null
        }),
      })

      if (res.hasError) {
        toast.error(res.message || "Erro ao criar agendamento.")
        return
      }

      toast.success("Agendamento criado com sucesso!")
      router.push("/appointments")
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
            <Link href="/appointments">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Novo Agendamento</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Informações do Agendamento</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="clientId">Cliente *</Label>
                  <Select
                    value={form.clientId}
                    onValueChange={(v) => setForm(p => ({ ...p, clientId: v }))}
                  >
                    <SelectTrigger id="clientId" className="w-full">
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="serviceId">Serviço (Opcional)</Label>
                  <Select
                    value={form.serviceId}
                    onValueChange={handleServiceChange}
                  >
                    <SelectTrigger id="serviceId" className="w-full">
                      <SelectValue placeholder="Selecione um serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {services?.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="scheduledDateTime">Data e Hora *</Label>
                  <Input
                    id="scheduledDateTime"
                    type="datetime-local"
                    value={form.scheduledDateTime}
                    onChange={(e) => setForm(p => ({ ...p, scheduledDateTime: e.target.value }))}
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="durationMinutes">Duração (minutos)</Label>
                  <Select
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
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="amount">Valor (R$)</Label>
                  <CurrencyInput
                    id="amount"
                    value={form.amount}
                    onChange={(v) => setForm(p => ({ ...p, amount: v }))}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="description">Descrição Curta</Label>
                  <Input
                    id="description"
                    placeholder="Ex: Corte e Barba"
                    value={form.description}
                    onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  placeholder="Observações adicionais sobre o agendamento..."
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirmar Agendamento
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/appointments">Cancelar</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  )
}
