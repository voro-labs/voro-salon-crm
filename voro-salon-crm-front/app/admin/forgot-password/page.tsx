"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Mail, ArrowLeft, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { API_CONFIG, apiCall } from "@/lib/api"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [emailError, setEmailError] = useState("")

  const validateEmail = (email: string): boolean => {
    if (!email) { setEmailError("Email é obrigatório"); return false }
    if (!/\S+@\S+\.\S+/.test(email)) { setEmailError("Email inválido"); return false }
    setEmailError("")
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!validateEmail(email)) return
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
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    if (emailError) setEmailError("")
    if (error) setError("")
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 text-green-600">
            <CheckCircle className="h-7 w-7" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-foreground">Email Enviado!</h2>
          <p className="mb-6 text-muted-foreground">
            Enviamos um link de recuperação para <strong className="text-foreground">{email}</strong>
          </p>

          <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm text-foreground">
              📧 Verifique sua caixa de entrada e spam. O link expira em 1 hora.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={() => { setSuccess(false); setEmail("") }} className="w-full">
              Enviar Novamente
            </Button>
            <Button variant="outline" onClick={() => router.push("/admin/sign-in")} className="w-full gap-2">
              <ArrowLeft size={16} /> Voltar ao Login
            </Button>
          </div>
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
            <Mail className="h-7 w-7" />
          </div>
          <h2 className="mb-1 text-2xl font-bold text-foreground">Esqueceu sua senha?</h2>
          <p className="text-sm text-muted-foreground">
            Digite seu email e enviaremos um link para redefinir sua senha
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              type="email"
              id="email"
              value={email}
              onChange={handleEmailChange}
              className={emailError ? "border-destructive" : ""}
              placeholder="seu@email.com"
              autoComplete="email"
              disabled={loading}
            />
            {emailError && <span className="text-xs text-destructive">{emailError}</span>}
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Enviando..." : "Enviar Link de Recuperação"}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/sign-in")}
            disabled={loading}
            className="w-full gap-2"
          >
            <ArrowLeft size={16} /> Voltar ao Login
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          💡 <strong>Dica:</strong> Verifique também sua pasta de spam
        </p>
      </div>
    </div>
  )
}
