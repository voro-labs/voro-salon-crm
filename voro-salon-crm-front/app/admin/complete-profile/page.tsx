"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, Loader2, UserCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { secureApiCall, API_CONFIG } from "@/lib/api"
import { useAuth } from "@/contexts/auth.context"

export default function CompleteProfilePage() {
  const router = useRouter()
  const { user } = useAuth()

  const [phoneNumber, setPhoneNumber] = useState("")
  const [countryCode, setCountryCode] = useState("+55")
  const [birthDate, setBirthDate] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!phoneNumber.trim()) {
      setError("O número de telefone é obrigatório.")
      return
    }

    setLoading(true)
    try {
      const res = await secureApiCall<null>(API_CONFIG.ENDPOINTS.COMPLETE_PROFILE, {
        method: "POST",
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
          countryCode: countryCode.trim(),
          birthDate: birthDate || null,
        }),
      })

      if (res.hasError) {
        setError(res.message ?? "Erro ao salvar perfil.")
        return
      }

      setSuccess(true)
      sessionStorage.removeItem("post_login_flags")
      setTimeout(() => router.replace("/"), 1500)
    } catch {
      setError("Erro inesperado. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-lg">

        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <UserCircle className="h-7 w-7" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Complete seu perfil</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {user ? `Olá, ${user.firstName}! ` : ""}
              Precisamos de mais algumas informações.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-sm font-medium">Perfil salvo! Redirecionando...</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-2">
            <div className="flex flex-col gap-1.5 w-24">
              <Label htmlFor="country-code">DDD/País</Label>
              <Input
                id="country-code"
                type="text"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                placeholder="+55"
                disabled={loading || success}
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="(11) 99999-0000"
                autoComplete="tel"
                disabled={loading || success}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="birth-date">Data de nascimento</Label>
            <Input
              id="birth-date"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              disabled={loading || success}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Os campos marcados com * são obrigatórios.
          </p>

          <Button type="submit" disabled={loading || success} className="w-full mt-2">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Salvando..." : success ? "Salvo!" : "Salvar e continuar"}
          </Button>
        </form>
      </div>
    </div>
  )
}
