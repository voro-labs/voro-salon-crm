"use client"

import { useState } from "react"
import useSWR from "swr"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Loader2, UserCircle, Briefcase, CalendarDays, Percent, Mail, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import { fetcher } from "@/lib/fetcher"
import { useAuth } from "@/contexts/auth.context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthGuard } from "@/components/auth/auth.guard"
import { PageHeader } from "@/components/ui/custom/page-header"

export default function EmployeeProfilePage() {
  const { user } = useAuth()
  const { data: employee, isLoading } = useSWR(API_CONFIG.ENDPOINTS.EMPLOYEE_ME, fetcher)
  const { data: _svcRaw } = useSWR(API_CONFIG.ENDPOINTS.SERVICES + "?pageSize=500", fetcher)
  const services = _svcRaw?.items ?? (Array.isArray(_svcRaw) ? _svcRaw : undefined)

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  async function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.")
      return
    }
    setIsSaving(true)
    try {
      const res = await secureApiCall<null>(API_CONFIG.ENDPOINTS.CHANGE_PASSWORD, {
        method: "POST",
        body: JSON.stringify({ newPassword }),
      })
      if (res.hasError) {
        toast.error(res.message ?? "Erro ao alterar senha.")
        return
      }
      toast.success("Senha alterada com sucesso!")
      setNewPassword("")
      setConfirmPassword("")
    } catch {
      toast.error("Erro de conexão.")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Perfil não encontrado.</p>
      </div>
    )
  }

  return (
    <AuthGuard requiredRoles={["SalonEmployee"]}>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <PageHeader
          title="Meu Perfil"
          description="Informações do seu cadastro no salão"
        />

        {/* Foto + nome */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-5">
              <div className="h-20 w-20 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
                {employee.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={employee.photoUrl} alt={employee.name} className="h-full w-full object-cover" />
                ) : (
                  <UserCircle className="h-10 w-10 text-muted-foreground/50" />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold truncate">{employee.name}</h2>
                <Badge variant="secondary" className="mt-1">Funcionário</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detalhes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Data de contratação</p>
                <p className="text-sm font-medium">
                  {employee.hireDate
                    ? format(new Date(employee.hireDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                    : "—"}
                </p>
              </div>
            </div>

            {employee.commissionPercentage != null && (
              <div className="flex items-center gap-3">
                <Percent className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Comissão</p>
                  <p className="text-sm font-medium">{employee.commissionPercentage}%</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Briefcase className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground mb-1.5">Especialidades</p>
                {employee.specialtyIds?.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {employee.specialtyIds.map((sid: string) => {
                      const svc = services?.find((s: any) => s.id === sid)
                      return (
                        <Badge key={sid} variant="outline">
                          {svc ? svc.name : "…"}
                        </Badge>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma especialidade cadastrada</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Acesso */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acesso ao Sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* E-mail */}
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">E-mail de login</p>
                <p className="text-sm font-medium">{user?.email ?? "—"}</p>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Formulário de troca de senha */}
            <form onSubmit={handleChangePassword} className="space-y-4">

              <div className="flex flex-col gap-2">
                <Label htmlFor="new-password">Nova senha</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNew ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="confirm-password">Confirmar senha</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repita a nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" size="sm" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar senha
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  )
}
