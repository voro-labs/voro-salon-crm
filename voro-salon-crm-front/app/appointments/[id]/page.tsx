"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useState } from "react"
import { ArrowLeft, Loader2, Trash2, UserCheck, CreditCard } from "lucide-react"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { CurrencyInput } from "@/components/currency-input"
import { AuthGuard } from "@/components/auth/auth.guard"
import { Badge } from "@/components/ui/badge"
import { useAppointmentDetail } from "@/hooks/use-appointment-detail.hook"
import { appointmentStatusConfig } from "@/components/ui/custom/status-badge"

export default function AppointmentDetailPage() {
  const params = useParams()
  const appointmentId = params.id as string
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<number | null>(null)
  const [selectedEmployeeForCompletion, setSelectedEmployeeForCompletion] = useState<string>("none")

  const {
    appointment,
    clients,
    services,
    employees,
    form,
    setForm,
    isLoading,
    isSaving,
    isDeleting,
    isModuleEnabled,
    handleServiceChange,
    updateAppointment,
    updateStatus,
    deleteAppointment,
  } = useAppointmentDetail(appointmentId)

  async function handleStatusClick(statusKey: number) {
    const COMPLETED_STATUS = 2
    const needsEmployeeSelection =
      statusKey === COMPLETED_STATUS &&
      (form.employeeId === "none" || !form.employeeId) &&
      employees && employees.length > 0

    if (needsEmployeeSelection) {
      setPendingStatus(statusKey)
      setSelectedEmployeeForCompletion("none")
      setEmployeeDialogOpen(true)
    } else {
      await updateStatus(statusKey)
    }
  }

  async function handleConfirmEmployeeAndComplete() {
    if (pendingStatus === null) return
    if (selectedEmployeeForCompletion !== "none") {
      setForm(p => ({ ...p, employeeId: selectedEmployeeForCompletion }))
      await updateAppointment({ ...form, employeeId: selectedEmployeeForCompletion })
    }
    await updateStatus(pendingStatus)
    setEmployeeDialogOpen(false)
    setPendingStatus(null)
  }

  if (isLoading || !appointment || !clients || !services) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <Card><CardContent className="h-64 animate-pulse rounded bg-muted/20" /></Card>
      </div>
    )
  }

  return (
    <AuthGuard requiredRoles={["SalonOwner", "SalonEmployee", "Owner"]}>
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" asChild className="shrink-0">
              <Link href="/appointments">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground text-balance truncate">
                Agendamento: {appointment?.clientName}
              </h1>
              <p className="text-xs text-muted-foreground truncate sm:hidden">Detalhes do cliente</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none h-10 border-destructive/40 text-destructive hover:bg-destructive hover:text-white">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir agendamento?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. O agendamento será removido permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={deleteAppointment}
                    disabled={isDeleting}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Editar Registros</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); updateAppointment(form) }} className="flex flex-col gap-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="clientId">Cliente *</Label>
                      <Select
                        key={`client-${form.clientId}`}
                        value={form.clientId}
                        onValueChange={(v) => setForm((p) => ({ ...p, clientId: v }))}
                      >
                        <SelectTrigger id="clientId" className="w-full">
                          <SelectValue placeholder="Selecione um cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients?.map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {isModuleEnabled(3) && (
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="serviceId">Serviço (Opcional)</Label>
                        <Select
                          key={`service-${form.serviceId}`}
                          value={form.serviceId}
                          onValueChange={handleServiceChange}
                        >
                          <SelectTrigger id="serviceId" className="w-full">
                            <SelectValue placeholder="Selecione um serviço" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhum</SelectItem>
                            {services?.map((s: any) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {isModuleEnabled(4) && (
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="employeeId">Funcionário (Opcional)</Label>
                        <Select
                          key={`employee-${form.employeeId}`}
                          value={form.employeeId}
                          onValueChange={(v) => setForm((p) => ({ ...p, employeeId: v }))}
                        >
                          <SelectTrigger id="employeeId" className="w-full">
                            <SelectValue placeholder="Selecione um funcionário" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Qualquer um</SelectItem>
                            {employees?.map((e: any) => (
                              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="scheduledDateTime">Data e Hora *</Label>
                      <Input
                        id="scheduledDateTime"
                        type="datetime-local"
                        value={form.scheduledDateTime}
                        onChange={(e) => setForm((p) => ({ ...p, scheduledDateTime: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="durationMinutes">Duração (minutos)</Label>
                      <Select
                        key={`duration-${form.durationMinutes}`}
                        value={form.durationMinutes.toString()}
                        onValueChange={(v) => setForm((p) => ({ ...p, durationMinutes: parseInt(v) }))}
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
                        onChange={(v) => setForm((p) => ({ ...p, amount: v }))}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="description">Descrição Curta</Label>
                      <Input
                        id="description"
                        placeholder="Ex: Corte e Barba"
                        value={form.description}
                        onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea
                      id="notes"
                      placeholder="Observações adicionais..."
                      rows={3}
                      value={form.notes}
                      onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    />
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                    <Button type="button" variant="outline" asChild className="w-full sm:w-auto h-11 text-sm sm:text-base">
                      <Link href="/appointments">Cancelar</Link>
                    </Button>
                    <Button type="submit" disabled={isSaving} className="w-full sm:w-auto h-11 text-sm sm:text-base">
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar Alterações
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Status do Agendamento</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {Object.entries(appointmentStatusConfig).map(([key, config]) => {
                  const StatusIcon = config.icon
                  const isActive = form.status === parseInt(key)
                  return (
                    <Button
                      key={key}
                      variant={isActive ? "default" : "outline"}
                      className={`justify-start ${isActive ? config.color + " border-none" : ""}`}
                      onClick={() => handleStatusClick(parseInt(key))}
                      disabled={isSaving}
                    >
                      <StatusIcon className="mr-2 h-4 w-4" />
                      {config.label}
                    </Button>
                  )
                })}
              </CardContent>
            </Card>

            {appointment?.clientMembershipId && (
              <Card className="bg-emerald-50 border-emerald-200">
                <CardContent className="p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-emerald-600" />
                    <h4 className="font-semibold text-sm text-emerald-700">Assinatura Utilizada</h4>
                  </div>
                  {appointment.membershipPlanName && (
                    <p className="text-xs text-emerald-700 font-medium">{appointment.membershipPlanName}</p>
                  )}
                  {appointment.membershipRemainingSessions !== null && appointment.membershipRemainingSessions !== undefined && (
                    <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 w-fit">
                      {appointment.membershipRemainingSessions} sessões restantes
                    </Badge>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="bg-primary/5 border-primary/10">
              <CardContent className="p-4 flex flex-col gap-3">
                <h4 className="font-semibold text-sm">Próximos Passos</h4>
                <p className="text-xs text-muted-foreground">
                  Ao concluir o atendimento, lembre-se de marcar como <strong>Concluído</strong> para manter seu histórico atualizado.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialog: selecionar funcionário ao concluir agendamento sem profissional */}
      <Dialog open={employeeDialogOpen} onOpenChange={(o) => { if (!o) { setEmployeeDialogOpen(false); setPendingStatus(null) } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Quem realizou o serviço?
            </DialogTitle>
            <DialogDescription>
              Este agendamento não tem funcionário definido. Selecione quem atendeu o cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select value={selectedEmployeeForCompletion} onValueChange={setSelectedEmployeeForCompletion}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar funcionário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não informar</SelectItem>
                {employees?.map((emp: any) => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setEmployeeDialogOpen(false); setPendingStatus(null) }}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmEmployeeAndComplete} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthGuard>
  )
}
