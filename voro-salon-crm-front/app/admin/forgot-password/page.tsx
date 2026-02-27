"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Mail, ArrowLeft, AlertCircle, CheckCircle } from "lucide-react"
import { API_CONFIG, apiCall } from "@/lib/api"
import { Input } from "@/components/ui/input"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [emailError, setEmailError] = useState("")

  const validateEmail = (email: string): boolean => {
    if (!email) {
      setEmailError("Email é obrigatório")
      return false
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Email inválido")
      return false
    }

    setEmailError("")
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!validateEmail(email)) {
      return
    }

    setLoading(true)

    try {
      const response = await apiCall(API_CONFIG.ENDPOINTS.FORGOT_PASSWORD, {
        method: "POST",
        body: JSON.stringify({ email }),
      })

      if (response.status === 200) {
        setSuccess(true)
      } else {
        setError(response.message || "Erro ao enviar email de recuperação")
      }
    } catch (error) {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    if (emailError) {
      setEmailError("")
    }
    if (error) {
      setError("")
    }
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-6 max-w-md w-full bg-white shadow-lg rounded-lg border border-gray-200">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Enviado!</h2>

            <p className="text-gray-600 mb-6">
              Enviamos um link de recuperação para <strong>{email}</strong>
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                📧 Verifique sua caixa de entrada e spam. O link expira em 1 hora.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setSuccess(false)
                  setEmail("")
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Enviar Novamente
              </button>

              <button
                onClick={() => router.push("/admin/sign-in")}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} />
                Voltar ao Login
              </button>
            </div>
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
            <Mail className="h-6 w-6 text-blue-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Esqueceu sua senha?</h2>

          <p className="text-gray-600">Digite seu email e enviaremos um link para redefinir sua senha</p>
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
          <div className="mb-6">
            <label htmlFor="email" className="block text-sm font-bold mb-2 text-gray-700">
              Email
            </label>
            <Input
              type="email"
              id="email"
              value={email}
              onChange={handleEmailChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-gray-700 ${
                emailError ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Digite seu email"
              autoComplete="email"
              disabled={loading}
            />
            {emailError && <span className="text-red-500 text-sm block mt-1">{emailError}</span>}
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
                  Enviando...
                </div>
              ) : (
                "Enviar Link de Recuperação"
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

        {/* Info */}
        <div className="mt-6 p-3 rounded-lg">
          <p className="text-xs text-gray-600 text-center">
            💡 <strong>Dica:</strong> Verifique também sua pasta de spam
          </p>
        </div>

      </div>
    </div>
  )
}
