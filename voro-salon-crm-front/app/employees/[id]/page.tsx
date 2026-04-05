"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { mutate } from "swr"
import { ArrowLeft, Loader2, Save, Trash2, Camera, Upload, ShieldCheck, ShieldOff, Search, RefreshCw, Eye, EyeOff, Target, TrendingUp } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { AuthGuard } from "@/components/auth/auth.guard"
import { useEmployeeDetail } from "@/hooks/use-employee-detail.hook"
import { API_CONFIG, secureApiCall } from "@/lib/api"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TransactionDto {
  employeeId: string
  employeeName: string
  amount: number
  paidAmount: number
  dueDate: string
  status: number
  description: string
}

// TransactionStatus: Pending=1, Partial=2, Paid=3, Overdue=4, Cancelled=5
const STATUS_LABEL: Record<number, string> = {
  1: "Pendente",
  2: "Parcial",
  3: "Pago",
  4: "Vencido",
  5: "Cancelado",
}

const STATUS_VARIANT: Record<number, string> = {
  1: "bg-yellow-100 text-yellow-800",
  2: "bg-blue-100 text-blue-800",
  3: "bg-green-100 text-green-800",
  4: "bg-red-100 text-red-800",
  5: "bg-gray-100 text-gray-500",
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function AuthenticatedImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  if (!src) {
    return <div className={`${className} flex items-center justify-center bg-muted/30`} />
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} />
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-"
  const d = new Date(dateStr)
  return d.toLocaleDateString("pt-BR")
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EmployeeDetailPage() {
  const params = useParams()
  const id = params.id as string

  const {
    employee,
    services,
    form,
    setForm,
    isLoading,
    isSaving,
    isDeleting,
    isUploadingPhoto,
    isNew,
    toggleSpecialty,
    handlePhotoUpload,
    saveEmployee,
    deleteEmployee,
  } = useEmployeeDetail(id)

  // --- System access modal state ---
  const [accessModalOpen, setAccessModalOpen] = useState(false)
  const [accessEmail, setAccessEmail] = useState("")
  const [accessPassword, setAccessPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isCreatingAccess, setIsCreatingAccess] = useState(false)
  const [isRevokingAccess, setIsRevokingAccess] = useState(false)
  const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false)

  // --- Goals state ---
  interface EmployeeGoalDto {
    id: string
    month: number
    year: number
    targetAmount: number
    targetAppointments: number
    actualAmount: number
    actualAppointments: number
    amountProgressPercent: number
    appointmentsProgressPercent: number
  }

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const [goalMonth, setGoalMonth] = useState(currentMonth)
  const [goalYear, setGoalYear] = useState(currentYear)
  const [goal, setGoal] = useState<EmployeeGoalDto | null>(null)
  const [isFetchingGoal, setIsFetchingGoal] = useState(false)
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [goalTargetAmount, setGoalTargetAmount] = useState(0)
  const [goalTargetAppointments, setGoalTargetAppointments] = useState(0)
  const [isSavingGoal, setIsSavingGoal] = useState(false)

  useEffect(() => {
    if (isNew || !id) return
    setIsFetchingGoal(true)
    secureApiCall<EmployeeGoalDto>(`/EmployeeGoal/${id}?month=${goalMonth}&year=${goalYear}`)
      .then((res) => setGoal((!res.hasError && res.data) ? res.data : null))
      .finally(() => setIsFetchingGoal(false))
  }, [isNew, id, goalMonth, goalYear])

  async function handleSaveGoal() {
    if (!goalTargetAmount && !goalTargetAppointments) {
      toast.error("Defina pelo menos uma meta (valor ou atendimentos).")
      return
    }
    setIsSavingGoal(true)
    try {
      const body = JSON.stringify({
        employeeId: id,
        month: goalMonth,
        year: goalYear,
        targetAmount: goalTargetAmount,
        targetAppointments: goalTargetAppointments,
      })
      const res = goal?.id
        ? await secureApiCall<EmployeeGoalDto>(`/EmployeeGoal/${goal.id}`, { method: "PUT", body })
        : await secureApiCall<EmployeeGoalDto>("/EmployeeGoal", { method: "POST", body })
      if (res.hasError) { toast.error(res.message || "Erro ao salvar meta."); return }
      toast.success("Meta salva com sucesso!")
      if (res.data) setGoal(res.data)
      setGoalModalOpen(false)
    } catch { toast.error("Erro de conexão.") }
    finally { setIsSavingGoal(false) }
  }

  // --- Commissions state ---
  const [commMonth, setCommMonth] = useState(currentMonth)
  const [commYear, setCommYear] = useState(currentYear)
  const [commissions, setCommissions] = useState<TransactionDto[]>([])
  const [isFetchingCommissions, setIsFetchingCommissions] = useState(false)
  const [commissionsFetched, setCommissionsFetched] = useState(false)

  // ---------------------------------------------------------------------------
  // Gera senha temporária com o mesmo padrão do backend (GenerateTempPassword)
  function generateTempPassword(): string {
    const upper   = "ABCDEFGHJKMNPQRSTUVWXYZ"
    const lower   = "abcdefghjkmnpqrstuvwxyz"
    const digits  = "23456789"
    const special = "!@#$"
    const all     = upper + lower + digits + special

    const pick = (src: string) => src[Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000 * src.length)]

    const chars = [
      pick(upper), pick(lower), pick(digits), pick(special),
      pick(all), pick(all), pick(all), pick(all),
      pick(all), pick(all), pick(all), pick(all),
    ]

    // Fisher-Yates shuffle
    for (let i = chars.length - 1; i > 0; i--) {
      const j = Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000 * (i + 1))
      ;[chars[i], chars[j]] = [chars[j], chars[i]]
    }

    return chars.join("")
  }

  // Handlers: System Access
  // ---------------------------------------------------------------------------

  async function handleCreateAccess() {
    if (!accessEmail.trim() || !accessPassword.trim()) {
      toast.error("Preencha o e-mail e a senha.")
      return
    }
    setIsCreatingAccess(true)
    try {
      const res = await secureApiCall<any>(`${API_CONFIG.ENDPOINTS.EMPLOYEES}/${id}/access`, {
        method: "POST",
        body: JSON.stringify({ email: accessEmail, password: accessPassword }),
      })
      if (res.hasError) {
        toast.error(res.message || "Erro ao criar acesso.")
        return
      }
      toast.success("Acesso criado com sucesso!")
      setAccessModalOpen(false)
      setAccessEmail("")
      setAccessPassword("")
      setShowPassword(false)
      mutate(API_CONFIG.ENDPOINTS.EMPLOYEES)
      mutate(`${API_CONFIG.ENDPOINTS.EMPLOYEES}/${id}`)
    } catch {
      toast.error("Erro de conexão.")
    } finally {
      setIsCreatingAccess(false)
    }
  }

  async function handleRevokeAccess() {
    setIsRevokingAccess(true)
    try {
      const res = await secureApiCall<any>(`${API_CONFIG.ENDPOINTS.EMPLOYEES}/${id}/access`, {
        method: "DELETE",
      })
      if (res.hasError) {
        toast.error(res.message || "Erro ao revogar acesso.")
        return
      }
      toast.success("Acesso revogado.")
      setRevokeConfirmOpen(false)
      mutate(API_CONFIG.ENDPOINTS.EMPLOYEES)
      mutate(`${API_CONFIG.ENDPOINTS.EMPLOYEES}/${id}`)
    } catch {
      toast.error("Erro de conexão.")
    } finally {
      setIsRevokingAccess(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Handlers: Commissions
  // ---------------------------------------------------------------------------

  async function fetchCommissions() {
    const from = `${commYear}-${String(commMonth).padStart(2, "0")}-01`
    const lastDay = new Date(commYear, commMonth, 0).getDate()
    const to = `${commYear}-${String(commMonth).padStart(2, "0")}-${lastDay}`

    setIsFetchingCommissions(true)
    try {
      const res = await secureApiCall<TransactionDto[]>(
        `${API_CONFIG.ENDPOINTS.EMPLOYEES}/${id}/commissions?from=${from}&to=${to}`
      )
      if (res.hasError) {
        toast.error(res.message || "Erro ao buscar comissões.")
        return
      }
      setCommissions(res.data ?? [])
      setCommissionsFetched(true)
    } catch {
      toast.error("Erro de conexão.")
    } finally {
      setIsFetchingCommissions(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!isNew && isLoading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="animate-spin" /></div>
  }

  const showCommissionsSection =
    !isNew && ((employee?.commissionPercentage && employee.commissionPercentage > 0) || commissions.length > 0)

  const totalAmount = commissions.reduce((sum, c) => sum + c.amount, 0)
  const totalPaid = commissions.reduce((sum, c) => sum + c.paidAmount, 0)

  const monthOptions = [
    { value: 1, label: "Janeiro" },
    { value: 2, label: "Fevereiro" },
    { value: 3, label: "Março" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Maio" },
    { value: 6, label: "Junho" },
    { value: 7, label: "Julho" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Setembro" },
    { value: 10, label: "Outubro" },
    { value: 11, label: "Novembro" },
    { value: 12, label: "Dezembro" },
  ]

  const yearOptions = [currentYear - 1, currentYear, currentYear + 1]

  return (
    <AuthGuard requiredRoles={["SalonOwner", "Owner"]}>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/employees">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {isNew ? "Novo Funcionário" : "Editar Funcionário"}
            </h1>
          </div>
          {!isNew && (
            <Button variant="destructive" size="sm" onClick={deleteEmployee} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">Excluir</span>
            </Button>
          )}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); saveEmployee(form) }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Dados Principais</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    placeholder="Nome do funcionário"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="hireDate">Data de Contratação</Label>
                    <Input
                      id="hireDate"
                      type="date"
                      value={form.hireDate}
                      onChange={(e) => setForm((p) => ({ ...p, hireDate: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-8">
                    <Checkbox
                      id="isActive"
                      checked={form.isActive}
                      onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: !!v }))}
                    />
                    <Label htmlFor="isActive" className="cursor-pointer">Funcionário Ativo</Label>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="commissionPercentage">Comissão (%)</Label>
                  <Input
                    id="commissionPercentage"
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    placeholder="Ex: 30"
                    value={form.commissionPercentage}
                    onChange={(e) => {
                      const raw = e.target.value
                      setForm((p) => ({
                        ...p,
                        commissionPercentage: raw === "" ? "" : Math.min(100, Math.max(0, Number(raw))),
                      }))
                    }}
                    className="w-48"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Foto do Funcionário</Label>
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-primary/20 bg-muted">
                      <AuthenticatedImage src={form.photoUrl} alt="Foto" className="h-full w-full object-cover" />
                      {isUploadingPhoto && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <Loader2 className="h-5 w-5 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1 h-9"
                          onClick={() => document.getElementById("photo-upload")?.click()}
                          disabled={isUploadingPhoto}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          {form.photoUrl ? "Alterar Foto" : "Enviar Foto"}
                        </Button>
                        {form.photoUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 px-0 text-destructive border-destructive/20 hover:bg-destructive/5"
                            onClick={() => setForm((p) => ({ ...p, photoUrl: "" }))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">JPG, PNG ou GIF. Máximo de 5MB.</p>
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Especialidades</CardTitle>
                <p className="text-sm text-muted-foreground">Selecione quais serviços este funcionário realiza</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {services?.map((service: any) => (
                    <div key={service.id} className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted/30 transition-colors">
                      <Checkbox
                        id={`svc-${service.id}`}
                        checked={form.specialtyIds.includes(service.id)}
                        onCheckedChange={() => toggleSpecialty(service.id)}
                      />
                      <Label htmlFor={`svc-${service.id}`} className="flex-1 cursor-pointer text-sm truncate">
                        {service.name}
                      </Label>
                    </div>
                  ))}
                  {services?.length === 0 && <p className="text-sm text-muted-foreground italic">Nenhum serviço cadastrado.</p>}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar Funcionário
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/employees">Cancelar</Link>
              </Button>
            </div>

            {/* Commissions Section */}
            {showCommissionsSection && (
              <Card>
                <CardHeader>
                  <CardTitle>Comissões</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Comissão configurada: {employee?.commissionPercentage ?? 0}%
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="comm-month">Mês</Label>
                      <select
                        id="comm-month"
                        value={commMonth}
                        onChange={(e) => setCommMonth(Number(e.target.value))}
                        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        {monthOptions.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="comm-year">Ano</Label>
                      <select
                        id="comm-year"
                        value={commYear}
                        onChange={(e) => setCommYear(Number(e.target.value))}
                        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        {yearOptions.map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={fetchCommissions}
                      disabled={isFetchingCommissions}
                    >
                      {isFetchingCommissions
                        ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        : <Search className="mr-2 h-4 w-4" />}
                      Buscar
                    </Button>
                  </div>

                  {commissionsFetched && (
                    commissions.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">Nenhuma comissão encontrada para o período.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="py-2 pr-4 text-left font-medium text-muted-foreground">Vencimento</th>
                              <th className="py-2 pr-4 text-left font-medium text-muted-foreground">Descrição</th>
                              <th className="py-2 pr-4 text-right font-medium text-muted-foreground">Valor</th>
                              <th className="py-2 pr-4 text-right font-medium text-muted-foreground">Pago</th>
                              <th className="py-2 text-left font-medium text-muted-foreground">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {commissions.map((c, idx) => (
                              <tr key={idx} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                <td className="py-2 pr-4 whitespace-nowrap">{formatDate(c.dueDate)}</td>
                                <td className="py-2 pr-4">{c.description}</td>
                                <td className="py-2 pr-4 text-right whitespace-nowrap">{formatCurrency(c.amount)}</td>
                                <td className="py-2 pr-4 text-right whitespace-nowrap">{formatCurrency(c.paidAmount)}</td>
                                <td className="py-2">
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_VARIANT[c.status] ?? "bg-gray-100 text-gray-500"}`}>
                                    {STATUS_LABEL[c.status] ?? "Desconhecido"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t bg-muted/20">
                              <td colSpan={2} className="py-2 pr-4 font-medium">Total do período</td>
                              <td className="py-2 pr-4 text-right font-semibold">{formatCurrency(totalAmount)}</td>
                              <td className="py-2 pr-4 text-right font-semibold">{formatCurrency(totalPaid)}</td>
                              <td />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )
                  )}
                </CardContent>
              </Card>
            )}
            {/* Goals Section */}
            {!isNew && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Metas
                    </CardTitle>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setGoalTargetAmount(goal?.targetAmount ?? 0)
                        setGoalTargetAppointments(goal?.targetAppointments ?? 0)
                        setGoalModalOpen(true)
                      }}
                    >
                      {goal ? "Editar Meta" : "Definir Meta"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {/* Month/Year navigation */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(goalYear, goalMonth - 2)
                        setGoalMonth(d.getMonth() + 1)
                        setGoalYear(d.getFullYear())
                      }}
                      className="h-7 w-7 rounded-md border bg-background hover:bg-muted flex items-center justify-center text-muted-foreground"
                    >‹</button>
                    <span className="text-sm font-medium min-w-[120px] text-center">
                      {new Date(goalYear, goalMonth - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(goalYear, goalMonth)
                        setGoalMonth(d.getMonth() + 1)
                        setGoalYear(d.getFullYear())
                      }}
                      className="h-7 w-7 rounded-md border bg-background hover:bg-muted flex items-center justify-center text-muted-foreground"
                    >›</button>
                  </div>

                  {isFetchingGoal ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
                      <Loader2 className="h-4 w-4 animate-spin" />Carregando...
                    </div>
                  ) : !goal ? (
                    <p className="text-sm text-muted-foreground italic py-4 text-center">
                      Nenhuma meta definida para este período.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-5">
                      {/* Amount progress */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1.5 font-medium">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            Faturamento
                          </span>
                          <span className="text-muted-foreground">
                            {formatCurrency(goal.actualAmount)} / {formatCurrency(goal.targetAmount)}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary rounded-full h-2 transition-all"
                            style={{ width: `${Math.min(goal.amountProgressPercent, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground text-right">{Math.round(goal.amountProgressPercent)}%</span>
                      </div>

                      {/* Appointments progress */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Target className="h-4 w-4 text-blue-500" />
                            Atendimentos
                          </span>
                          <span className="text-muted-foreground">
                            {goal.actualAppointments} / {goal.targetAppointments}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-blue-500 rounded-full h-2 transition-all"
                            style={{ width: `${Math.min(goal.appointmentsProgressPercent, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground text-right">{Math.round(goal.appointmentsProgressPercent)}%</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4 py-8">
                <div className="h-32 w-32 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-primary/20">
                  {form.photoUrl ? (
                    <AuthenticatedImage src={form.photoUrl} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-12 w-12 text-muted-foreground/30" />
                  )}
                </div>
                <div className="text-center">
                  <h4 className="font-bold text-lg">{form.name || "Nome do Funcionário"}</h4>
                  <p className="text-xs text-muted-foreground">{form.isActive ? "Ativo" : "Inativo"}</p>
                </div>
                <div className="flex flex-wrap justify-center gap-1 mt-2">
                  {form.specialtyIds.slice(0, 5).map((sid: string) => (
                    <Badge key={sid} variant="secondary" className="text-[10px]">
                      {services?.find((s: any) => s.id === sid)?.name}
                    </Badge>
                  ))}
                  {form.specialtyIds.length > 5 && (
                    <Badge variant="secondary" className="text-[10px]">+{form.specialtyIds.length - 5}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* System Access Card */}
            {!isNew && (
              <Card>
                <CardHeader>
                  <CardTitle>Acesso ao Sistema</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {employee?.hasAccess ? (
                    <>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-green-600" />
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Acesso ativo</Badge>
                      </div>
                      {employee?.userId && (
                        <p className="text-xs text-muted-foreground break-all">
                          ID do usuário: {employee.userId}
                        </p>
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setRevokeConfirmOpen(true)}
                        disabled={isRevokingAccess}
                      >
                        {isRevokingAccess
                          ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          : <ShieldOff className="mr-2 h-4 w-4" />}
                        Revogar Acesso
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <ShieldOff className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Sem acesso</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAccessModalOpen(true)}
                      >
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Criar Acesso
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </form>

        {/* Create Access Modal */}
        {accessModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-xl">
              <h2 className="mb-1 text-lg font-semibold">Criar Acesso ao Sistema</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Defina o e-mail e a senha para que o funcionário acesse o sistema.
              </p>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="access-email">E-mail</Label>
                  <Input
                    id="access-email"
                    type="email"
                    placeholder="funcionario@exemplo.com"
                    value={accessEmail}
                    onChange={(e) => setAccessEmail(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="access-password">Senha</Label>
                    <button
                      type="button"
                      onClick={() => {
                        const pwd = generateTempPassword()
                        setAccessPassword(pwd)
                        setShowPassword(true)
                      }}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Gerar senha
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="access-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={accessPassword}
                      onChange={(e) => setAccessPassword(e.target.value)}
                      autoComplete="new-password"
                      className="pr-9 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAccessModalOpen(false)
                    setAccessEmail("")
                    setAccessPassword("")
                    setShowPassword(false)
                  }}
                  disabled={isCreatingAccess}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateAccess}
                  disabled={isCreatingAccess}
                >
                  {isCreatingAccess ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Confirmar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Goal Modal */}
        {goalModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-xl">
              <h2 className="mb-1 text-lg font-semibold flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                {goal ? "Editar Meta" : "Definir Meta"}
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                {new Date(goalYear, goalMonth - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </p>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="goal-amount">Meta de Faturamento (R$)</Label>
                  <Input
                    id="goal-amount"
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="Ex: 5000"
                    value={goalTargetAmount || ""}
                    onChange={(e) => setGoalTargetAmount(Number(e.target.value))}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="goal-appointments">Meta de Atendimentos</Label>
                  <Input
                    id="goal-appointments"
                    type="number"
                    min={0}
                    step={1}
                    placeholder="Ex: 40"
                    value={goalTargetAppointments || ""}
                    onChange={(e) => setGoalTargetAppointments(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setGoalModalOpen(false)}
                  disabled={isSavingGoal}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveGoal}
                  disabled={isSavingGoal}
                >
                  {isSavingGoal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Revoke Access Confirmation Modal */}
        {revokeConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-xl">
              <h2 className="mb-1 text-lg font-semibold">Revogar Acesso</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Tem certeza que deseja revogar o acesso ao sistema deste funcionário? Esta ação não pode ser desfeita sem criar um novo acesso.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRevokeConfirmOpen(false)}
                  disabled={isRevokingAccess}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleRevokeAccess}
                  disabled={isRevokingAccess}
                >
                  {isRevokingAccess ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Revogar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  )
}
