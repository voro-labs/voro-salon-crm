"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft, Loader2 } from "lucide-react"
import { API_CONFIG, apiCall } from "@/lib/api"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email")
  const token = searchParams.get("token")

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({
    newPassword: "",
    confirmPassword: "",
  })
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)

  // Verificar se o token existe na URL
  useEffect(() => {
    if (!token) {
      setError("Token de recuperação não encontrado na URL")
      setTokenValid(false)
    } else {
      setTokenValid(true)
    }
  }, [token])

  const validatePassword = (password: string): boolean => {
    if (!password) {
      setFieldErrors((prev) => ({ ...prev, newPassword: "Nova senha é obrigatória" }))
      return false
    }

    if (password.length < 8) {
      setFieldErrors((prev) => ({ ...prev, newPassword: "Senha deve ter pelo menos 8 caracteres" }))
      return false
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(password)) {
      setFieldErrors((prev) => ({
        ...prev,
        newPassword: "Senha deve conter: maiúscula, minúscula, número e caractere especial",
      }))
      return false
    }

    setFieldErrors((prev) => ({ ...prev, newPassword: "" }))
    return true
  }

  const validateConfirmPassword = (confirmPassword: string): boolean => {
    if (!confirmPassword) {
      setFieldErrors((prev) => ({ ...prev, confirmPassword: "Confirmação de senha é obrigatória" }))
      return false
    }

    if (confirmPassword !== formData.newPassword) {
      setFieldErrors((prev) => ({ ...prev, confirmPassword: "Senhas não coincidem" }))
      return false
    }

    setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }))
    return true
  }

  const validateForm = (): boolean => {
    const isPasswordValid = validatePassword(formData.newPassword)
    const isConfirmPasswordValid = validateConfirmPassword(formData.confirmPassword)
    return isPasswordValid && isConfirmPasswordValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const response = await apiCall(API_CONFIG.ENDPOINTS.RESET_PASSWORD, {
        method: "POST",
        body: JSON.stringify({
          token,
          email,
          newPassword: formData.newPassword
        }),
      })

      if (response.status === 200) {
        setSuccess(true)
      } else {
        setError(response.message || "Erro ao redefinir senha")
      }
    } catch (error) {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Limpar erros quando o usuário começar a digitar
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }))
    }
    if (error) {
      setError("")
    }
  }

  const getPasswordStrength = (password: string): { strength: number; text: string; color: string } => {
    let strength = 0
    if (password.length >= 8) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/\d/.test(password)) strength++
    if (/[@$!%*?&]/.test(password)) strength++

    const levels = [
      { text: "Muito fraca", color: "text-destructive" },
      { text: "Fraca", color: "text-orange-500" },
      { text: "Regular", color: "text-yellow-500" },
      { text: "Boa", color: "text-primary" },
      { text: "Forte", color: "text-green-600" },
    ]

    return { strength, ...levels[strength] }
  }

  // Se não há token, mostrar erro
  if (tokenValid === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-7 w-7" />
          </div>

          <h2 className="mb-2 text-2xl font-bold text-foreground">Link Inválido</h2>

          <p className="mb-6 text-sm text-muted-foreground font-medium">O link de recuperação é inválido ou expirou.</p>

          <Button
            onClick={() => router.push("/admin/forgot-password")}
            className="w-full"
          >
            Solicitar Novo Link
          </Button>
        </div>
      </div>
    )
  }

  // Tela de sucesso
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 text-green-600">
            <CheckCircle className="h-7 w-7" />
          </div>

          <h2 className="mb-2 text-2xl font-bold text-foreground">Senha Redefinida!</h2>

          <p className="mb-6 text-sm text-muted-foreground font-medium">
            Sua senha foi alterada com sucesso. Agora você pode fazer login com sua nova senha.
          </p>

          <Button
            onClick={() => router.push("/admin/sign-in")}
            className="w-full"
          >
            Ir para Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="h-7 w-7" />
          </div>

          <h2 className="mb-1 text-2xl font-bold text-foreground">Redefinir Senha</h2>

          <p className="text-sm text-muted-foreground">Digite sua nova senha abaixo</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-5 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="text-sm">{error}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Nova Senha */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newPassword">Nova Senha</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                id="newPassword"
                value={formData.newPassword}
                onChange={(e) => handleInputChange("newPassword", e.target.value)}
                className={`pr-10 ${fieldErrors.newPassword ? "border-destructive" : ""}`}
                placeholder="Digite sua nova senha"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                disabled={loading}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.newPassword && (
              <span className="text-xs text-destructive">{fieldErrors.newPassword}</span>
            )}

            {/* Indicador de força da senha */}
            {formData.newPassword && (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${getPasswordStrength(formData.newPassword).strength >= 4
                          ? "bg-green-500"
                          : getPasswordStrength(formData.newPassword).strength >= 3
                            ? "bg-primary"
                            : getPasswordStrength(formData.newPassword).strength >= 2
                              ? "bg-yellow-500"
                              : "bg-destructive"
                        }`}
                      style={{ width: `${(getPasswordStrength(formData.newPassword).strength / 5) * 100}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${getPasswordStrength(formData.newPassword).color}`}>
                    {getPasswordStrength(formData.newPassword).text}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Confirmar Senha */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                className={`pr-10 ${fieldErrors.confirmPassword ? "border-destructive" : ""}`}
                placeholder="Confirme sua nova senha"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                disabled={loading}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <span className="text-xs text-destructive">{fieldErrors.confirmPassword}</span>
            )}
          </div>

          {/* Buttons */}
          <div className="mt-2 flex flex-col gap-3">
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Redefinindo..." : "Redefinir Senha"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/sign-in")}
              className="w-full gap-2"
              disabled={loading}
            >
              <ArrowLeft size={16} />
              Voltar ao Login
            </Button>
          </div>
        </form>

        {/* Requisitos da senha */}
        <div className="mt-8 border-t border-border pt-6">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Requisitos da senha:</p>
          <ul className="text-xs text-muted-foreground space-y-2">
            <li className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-primary" />
              Mínimo 8 caracteres
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-primary" />
              Pelo menos 1 letra maiúscula
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-primary" />
              Pelo menos 1 letra minúscula
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-primary" />
              Pelo menos 1 número
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-primary" />
              Caractere especial (@$!%*?&)
            </li>
          </ul>
        </div>

      </div>
    </div>
  )
}
