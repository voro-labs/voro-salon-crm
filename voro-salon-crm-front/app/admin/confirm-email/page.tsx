"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle, AlertCircle, MailCheck, ArrowLeft } from "lucide-react"
import { API_CONFIG, apiCall } from "@/lib/api"

export default function ConfirmEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const email = searchParams.get("email")

  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState<boolean | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!token || !email) {
      setError("Token ou e-mail inválido na URL.")
      setSuccess(false)
      setLoading(false)
      return
    }

    const confirmEmail = async () => {
      try {
        const response = await apiCall(API_CONFIG.ENDPOINTS.CONFIRM_EMAIL, {
          method: "POST",
          body: JSON.stringify({
            token,
            email,
          }),
        })

        if (response.status === 200) {
          setSuccess(true)
        } else {
          setSuccess(false)
          setError(response.message || "Erro ao confirmar o e-mail.")
        }
      } catch {
        setSuccess(false)
        setError("Erro de conexão. Tente novamente.")
      } finally {
        setLoading(false)
      }
    }

    confirmEmail()
  }, [token, email])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen animate-pulse">
        <div className="text-gray-500 text-lg">Confirmando e-mail...</div>
      </div>
    )
  }

  if (success === false) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-6 max-w-md w-full bg-white shadow-lg rounded-lg border border-gray-200 text-center">

          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Falha ao confirmar</h2>
          <p className="text-gray-600 mb-6">{error}</p>

          <button
            onClick={() => router.push("/admin/sign-in")}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} />
            Voltar ao Login
          </button>

        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="p-6 max-w-md w-full bg-white shadow-lg rounded-lg border border-gray-200 text-center">

        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">E-mail confirmado!</h2>

        <p className="text-gray-600 mb-6">
          Seu endereço de e-mail foi verificado com sucesso. Agora você já pode fazer login.
        </p>

        <button
          onClick={() => router.push("/admin/sign-in")}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <MailCheck size={16} />
          Ir para Login
        </button>

      </div>
    </div>
  )
}
