"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react"
import { API_CONFIG, apiCall } from "@/lib/api"
import { Input } from "@/components/ui/input"

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
      { text: "Muito fraca", color: "text-red-600" },
      { text: "Fraca", color: "text-orange-600" },
      { text: "Regular", color: "text-yellow-600" },
      { text: "Boa", color: "text-blue-600" },
      { text: "Forte", color: "text-green-600" },
    ]

    return { strength, ...levels[strength] }
  }

  // Se não há token, mostrar erro
  if (tokenValid === false) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-6 max-w-md w-full bg-white shadow-lg rounded-lg border border-gray-200">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">Link Inválido</h2>

            <p className="text-gray-600 mb-6">O link de recuperação é inválido ou expirou.</p>

            <button
              onClick={() => router.push("/admin/forgot-password")}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Solicitar Novo Link
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Tela de sucesso
  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-6 max-w-md w-full bg-white shadow-lg rounded-lg border border-gray-200">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">Senha Redefinida!</h2>

            <p className="text-gray-600 mb-6">
              Sua senha foi alterada com sucesso. Agora você pode fazer login com sua nova senha.
            </p>

            <button
              onClick={() => router.push("/admin/sign-in")}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ir para Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="p-6 max-w-md w-full bg-white shadow-lg rounded-lg border border-gray-200">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <Lock className="h-6 w-6 text-blue-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Redefinir Senha</h2>

          <p className="text-gray-600">Digite sua nova senha abaixo</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex items-start gap-2">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="text-sm">{error}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Nova Senha */}
          <div className="mb-4">
            <label htmlFor="newPassword" className="block text-sm font-bold mb-2 text-gray-700">
              Nova Senha
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                id="newPassword"
                value={formData.newPassword}
                onChange={(e) => handleInputChange("newPassword", e.target.value)}
                className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-gray-700 ${
                  fieldErrors.newPassword ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Digite sua nova senha"
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
            {fieldErrors.newPassword && (
              <span className="text-red-500 text-sm block mt-1">{fieldErrors.newPassword}</span>
            )}

            {/* Indicador de força da senha */}
            {formData.newPassword && (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        getPasswordStrength(formData.newPassword).strength >= 4
                          ? "bg-green-500"
                          : getPasswordStrength(formData.newPassword).strength >= 3
                            ? "bg-blue-500"
                            : getPasswordStrength(formData.newPassword).strength >= 2
                              ? "bg-yellow-500"
                              : "bg-red-500"
                      }`}
                      style={{ width: `${(getPasswordStrength(formData.newPassword).strength / 5) * 100}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${getPasswordStrength(formData.newPassword).color}`}>
                    {getPasswordStrength(formData.newPassword).text}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Confirmar Senha */}
          <div className="mb-6">
            <label htmlFor="confirmPassword" className="block text-sm font-bold mb-2 text-gray-700">
              Confirmar Nova Senha
            </label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-gray-700 ${
                  fieldErrors.confirmPassword ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Confirme sua nova senha"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                disabled={loading}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <span className="text-red-500 text-sm block mt-1">{fieldErrors.confirmPassword}</span>
            )}
          </div>

          {/* Buttons */}
          <div className="space-y-3">
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
                  Redefinindo...
                </div>
              ) : (
                "Redefinir Senha"
              )}
            </button>

            <button
              type="button"
              onClick={() => router.push("/admin/sign-in")}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              disabled={loading}
            >
              <ArrowLeft size={16} />
              Voltar ao Login
            </button>
          </div>
        </form>

        {/* Requisitos da senha */}
        <div className="mt-6 p-3 rounded-lg">
          <p className="text-xs text-gray-600 font-medium mb-2">Requisitos da senha:</p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Mínimo 8 caracteres</li>
            <li>• Pelo menos 1 letra maiúscula</li>
            <li>• Pelo menos 1 letra minúscula</li>
            <li>• Pelo menos 1 número</li>
            <li>• Pelo menos 1 caractere especial (@$!%*?&)</li>
          </ul>
        </div>

      </div>
    </div>
  )
}
