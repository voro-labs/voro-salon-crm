"use client"

import { useState } from "react"
import { BanIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import useSWR from "swr"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import { fetcher } from "@/lib/fetcher"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface BlockTimeSlotDialogProps {
  onSuccess?: () => void
}

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function BlockTimeSlotDialog({ onSuccess }: BlockTimeSlotDialogProps) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const now = new Date()
  const later = new Date(now.getTime() + 60 * 60 * 1000)

  const { data: employees } = useSWR<any[]>(API_CONFIG.ENDPOINTS.EMPLOYEES, fetcher)
  const isEmployeeMode = employees && employees.length > 0

  const [form, setForm] = useState({
    startDateTime: toLocalInputValue(now),
    endDateTime: toLocalInputValue(later),
    reason: "",
    clientMessage: "",
    employeeId: "none",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.startDateTime || !form.endDateTime) return
    if (new Date(form.endDateTime) <= new Date(form.startDateTime)) {
      toast.error("O horário de término deve ser após o início.")
      return
    }

    setSubmitting(true)
    try {
      const res = await secureApiCall(API_CONFIG.ENDPOINTS.TIME_SLOT_BLOCKS, {
        method: "POST",
        body: JSON.stringify({
          startDateTime: new Date(form.startDateTime).toISOString(),
          endDateTime: new Date(form.endDateTime).toISOString(),
          reason: form.reason || null,
          clientMessage: form.clientMessage || null,
          employeeId: form.employeeId !== "none" ? form.employeeId : null,
        }),
      })

      if (res.hasError) {
        toast.error(res.message || "Erro ao bloquear horário.")
        return
      }

      toast.success("Horário bloqueado com sucesso!")
      setOpen(false)
      setForm({
        startDateTime: toLocalInputValue(new Date()),
        endDateTime: toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)),
        reason: "",
        clientMessage: "",
        employeeId: "none",
      })
      onSuccess?.()
    } catch {
      toast.error("Erro de conexão.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BanIcon className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Bloquear Horário</span>
          <span className="sm:hidden">Bloquear</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bloquear Horário</DialogTitle>
          <DialogDescription>
            Bloqueie um período para impedir novos agendamentos nesse intervalo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="startDateTime">Início *</Label>
              <Input
                id="startDateTime"
                type="datetime-local"
                value={form.startDateTime}
                onChange={(e) => setForm((p) => ({ ...p, startDateTime: e.target.value }))}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="endDateTime">Término *</Label>
              <Input
                id="endDateTime"
                type="datetime-local"
                value={form.endDateTime}
                min={form.startDateTime}
                onChange={(e) => setForm((p) => ({ ...p, endDateTime: e.target.value }))}
                required
              />
            </div>
          </div>

          {isEmployeeMode && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="employeeId">Profissional (Opcional)</Label>
              <Select
                value={form.employeeId}
                onValueChange={(val) => setForm((p) => ({ ...p, employeeId: val }))}
              >
                <SelectTrigger id="employeeId" className="w-full">
                  <SelectValue placeholder="Selecione um profissional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Todos os profissionais (Salão fechado)</SelectItem>
                  {employees?.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Selecione um profissional específico ou deixe "Todos" para bloquear a agenda inteira.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reason">Motivo (uso interno)</Label>
            <Input
              id="reason"
              placeholder="Ex: Almoço, reunião, manutenção..."
              value={form.reason}
              onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="clientMessage">Mensagem para clientes (opcional)</Label>
            <Textarea
              id="clientMessage"
              placeholder="Ex: Estabelecimento fechado neste período."
              rows={2}
              value={form.clientMessage}
              onChange={(e) => setForm((p) => ({ ...p, clientMessage: e.target.value }))}
            />
            <p className="text-[11px] text-muted-foreground">
              Exibida quando o cliente tentar agendar nesse horário.
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Bloquear
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
