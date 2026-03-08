"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, AlertCircle, Scissors, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth.context"
import { useSignIn } from "@/hooks/use-sign-in.hook"
import { SignInDto } from "@/types/DTOs/sign-in.interface"
import { LoadingSimple } from "@/components/ui/custom/loading/loading-simple"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export default function SignInPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { signIn, loading, error, clearError } = useSignIn()

  const [formData, setFormData] = useState<SignInDto>({
    email: "",
    password: ""
  })

  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" })

  // Redirecionar se já estiver logado
  useEffect(() => {
    if (!authLoading && user?.token) {
      router.replace("/")
    }
  }, [user, authLoading, router])

  const validateForm = (): boolean => {
    const errors: any = { email: "", password: "" }

    if (!formData.email) {
      errors.email = "Email é obrigatório"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Email inválido"
    }

    if (!formData.password) {
      errors.password = "Senha é obrigatória"
    } else if (formData.password.length < 6) {
      errors.password = "Senha deve ter pelo menos 6 caracteres"
    }

    setFieldErrors(errors)
    return !errors.email && !errors.password
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    if (!validateForm()) return
    const result = await signIn(formData)
    if (result.success) {
      router.push("/")
    }
  }

  const handleInputChange = (field: keyof SignInDto, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  if (authLoading || user?.token) return <LoadingSimple />

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-lg">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Scissors className="h-7 w-7" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Salon CRM</h1>
            <p className="mt-1 text-sm text-muted-foreground">Gerenciamento de clientes e serviços</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className={fieldErrors.email ? "border-destructive" : ""}
              placeholder="seu@email.com"
              autoComplete="email"
              disabled={loading}
            />
            {fieldErrors.email && (
              <span className="text-xs text-destructive">{fieldErrors.email}</span>
            )}
          </div>

          {/* Senha */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                id="password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className={`pr-10 ${fieldErrors.password ? "border-destructive" : ""}`}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                disabled={loading}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.password && (
              <span className="text-xs text-destructive">{fieldErrors.password}</span>
            )}
          </div>

          {/* Esqueceu senha */}
          <div className="flex justify-end">
            <a href="/admin/forgot-password" className="text-sm text-primary hover:underline">
              Esqueceu a senha?
            </a>
          </div>

          {/* Submit */}
          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  )
}
