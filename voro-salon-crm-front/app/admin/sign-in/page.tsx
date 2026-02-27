"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, AlertCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth.context"
import { useSignIn } from "@/hooks/use-sign-in.hook"
import { SignInDto } from "@/types/DTOs/sign-in.interface"
import { LoadingSimple } from "@/components/ui/custom/loading/loading-simple"
import { Input } from "@/components/ui/input"

export default function SignInPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { signIn, loading, error, clearError } = useSignIn()

  const [formData, setFormData] = useState<SignInDto>({
    email: "",
    password: ""
  })

  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({
    email: "",
    password: ""
  })

  // Redirecionar se já estiver logado
  useEffect(() => {
    if (user?.token) {
      router.push("/admin/dashboard")
    }
  }, [user, router])

  const validateForm = (): boolean => {
    const errors: any = {
      email: "",
      password: ""
    }

    if (!formData.email) {
      errors.email = "email é obrigatório"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "email inválido"
    }

    if (!formData.password) {
      errors.password = "Senha é obrigatória"
    } else if (formData.password.length < 6) {
      errors.password = "Senha deve ter pelo menos 6 caracteres"
    }

    setFieldErrors(errors)
    return Object.keys(errors).values.length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    if (!validateForm()) {
      return
    }

    const result = await signIn(formData)

    if (result.success) {
      router.push("/admin/dashboard")
    }
  }

  const handleInputChange = (field: keyof SignInDto, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Limpar erro do campo quando o usuário começar a digitar
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  if (user?.token) {
    return <LoadingSimple />
  }

  if (loading) {
    return <LoadingSimple />
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="p-6 max-w-sm w-full bg-white shadow-lg rounded-lg border border-gray-200">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-900">Sign-In</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex items-start gap-2">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="text-sm">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-bold mb-2 text-gray-700">
              Email
            </label>
            <Input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-gray-700 ${
                fieldErrors.email ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Seu email"
              autoComplete="email"
              disabled={loading}
            />
            {fieldErrors.email && <span className="text-red-500 text-sm block mt-1">{fieldErrors.email}</span>}
          </div>

          {/* Senha */}
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-bold mb-2 text-gray-700">
              Senha
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                id="password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-gray-700 ${
                  fieldErrors.password ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Sua senha"
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                disabled={loading}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {fieldErrors.password && <span className="text-red-500 text-sm block mt-1">{fieldErrors.password}</span>}
          </div>

          {/* Remember + Esqueceu senha */}
          <div className="flex items-center justify-between mb-6">
            <a href="/admin/forgot-password" className="text-sm text-blue-600 hover:underline">
              Esqueceu a senha?
            </a>
          </div>

          {/* Botão */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            } text-white`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Entrando...
              </div>
            ) : (
              "Entrar"
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
