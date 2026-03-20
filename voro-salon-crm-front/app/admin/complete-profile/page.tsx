"use client"

import { useState, useEffect, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Calendar as CalendarIcon, CheckCircle2, Loader2, UserCircle } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { PhoneInput } from "@/components/ui/custom/phone-input"
import { CountrySelector } from "@/components/ui/custom/country-selector"
import { secureApiCall, API_CONFIG } from "@/lib/api"
import { useAuth } from "@/contexts/auth.context"

export default function CompleteProfilePage() {
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    const flagsRaw = sessionStorage.getItem("post_login_flags")
    if (!flagsRaw) { router.replace("/"); return }
    try {
      const flags = JSON.parse(flagsRaw)
      if (!flags.requiresProfileCompletion) router.replace("/")
    } catch {
      router.replace("/")
    }
  }, [router])

  const [countryCode, setCountryCode] = useState("BR")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [birthDate, setBirthDate] = useState<Date | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
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
          birthDate: birthDate ? format(birthDate, "yyyy-MM-dd") : null,
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
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">Telefone *</Label>
            <div className="flex flex-row gap-2">
              <div className="shrink-0">
                <CountrySelector value={countryCode} onChange={setCountryCode} />
              </div>
              <div className="flex-1">
                <PhoneInput
                  id="phone"
                  value={phoneNumber}
                  autoComplete="tel"
                  onChange={setPhoneNumber}
                  countryCode={countryCode}
                  disabled={loading || success}
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Data de nascimento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading || success}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !birthDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {birthDate
                    ? format(birthDate, "PPP", { locale: ptBR })
                    : <span>Selecione uma data</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={birthDate}
                  onSelect={setBirthDate}
                  captionLayout="dropdown"
                  fromYear={1920}
                  toYear={new Date().getFullYear()}
                  disabled={(date) => date > new Date()}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
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
