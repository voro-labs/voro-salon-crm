"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, CheckCircle, ShieldCheck } from "lucide-react"
import { API_CONFIG, apiCall } from "@/lib/api"
import { Button } from "@/components/ui/button"

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
      document.getElementById(`code-${index + 1}`)?.focus()
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
        setTimeout(() => router.push("/admin/create-password"), 1000)
      } else {
        setError(response.message || "Código inválido")
      }
    } catch {
      setError("Erro ao validar código.")
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-foreground">Link inválido</h2>
          <p className="text-sm text-muted-foreground">Nenhum token foi fornecido.</p>
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
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h2 className="mb-1 text-2xl font-bold text-foreground">Verifique seu Código</h2>
          <p className="text-sm text-muted-foreground">
            Digite o código de 6 dígitos enviado ao seu email.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-green-700">
            <CheckCircle size={18} className="mt-0.5 shrink-0" />
            <span className="text-sm">Código validado com sucesso!</span>
          </div>
        )}

        {/* Code inputs */}
        <div className="mb-6 flex justify-between gap-2">
          {digits.map((digit, index) => (
            <input
              key={index}
              id={`code-${index}`}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              className="h-14 w-12 rounded-xl border-2 border-border bg-background text-center text-xl font-bold text-foreground transition-colors focus:border-primary focus:outline-none"
            />
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Não recebeu?{" "}
          <Button variant="link" className="h-auto p-0 text-xs text-primary">
            Reenviar código
          </Button>
        </p>
      </div>
    </div>
  )
}
