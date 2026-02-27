"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, CheckCircle, ShieldCheck } from "lucide-react"
import { API_CONFIG, apiCall } from "@/lib/api"

export default function VerifyCodePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [digits, setDigits] = useState(["", "", "", "", "", ""])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return

    const newDigits = [...digits]
    newDigits[index] = value
    setDigits(newDigits)

    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`)
      nextInput?.focus()
    }

    if (newDigits.every((d) => d !== "")) {
      submitCode(newDigits.join(""))
    }
  }

  const submitCode = async (code: string) => {
    setError("")

    try {
      const response = await apiCall(API_CONFIG.ENDPOINTS.VERIFY_CODE, {
        method: "POST",
        body: JSON.stringify({ code, token }),
      })

      if (response.status === 200) {
        setSuccess(true)
        setTimeout(() => {
          router.push("/admin/create-password")
        }, 1000)
      } else {
        setError(response.message || "Código inválido")
      }
    } catch {
      setError("Erro ao validar código.")
    }
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-6 max-w-md w-full bg-white shadow-lg rounded-lg border border-gray-200 text-center">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-2"/>
          <h2 className="text-gray-700 text-xl font-bold mb-2">Link inválido</h2>
          <p className="text-gray-500">Nenhum token foi fornecido.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="p-6 max-w-md w-full bg-white shadow-lg rounded-lg border border-gray-200">
        
        <div className="text-center mb-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <ShieldCheck className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifique seu Código</h2>
          <p className="text-gray-600 text-sm">Digite o código de 6 dígitos enviado ao seu email.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex items-start gap-2">
            <AlertCircle size={20} className="shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded flex items-start gap-2">
            <CheckCircle size={20} className="shrink-0" />
            <span className="text-sm">Código validado com sucesso!</span>
          </div>
        )}

        <div className="flex justify-between gap-2 mb-6">
          {digits.map((digit, index) => (
            <input
              key={index}
              id={`code-${index}`}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              className="w-12 h-14 border text-xl text-center rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ))}
        </div>

        <p className="text-gray-500 text-xs text-center">
          Não recebeu?{" "}
          <button className="text-blue-600 hover:underline">Reenviar código</button>
        </p>

      </div>
    </div>
  )
}
