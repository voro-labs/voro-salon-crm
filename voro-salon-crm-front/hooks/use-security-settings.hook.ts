"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth.context"
import { secureApiCall, API_CONFIG } from "@/lib/api"
import { toast } from "sonner"

export function useSecuritySettings() {
  const { user, refreshUser } = useAuth()

  const emailConfirmed = user?.emailConfirmed ?? false

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled ?? false)
  const [tfa2Dialog, set2FADialog] = useState<"idle" | "request" | "confirm" | "disable">("idle")
  const [tfaCode, setTfaCode] = useState("")
  const [tfaLoading, setTfaLoading] = useState(false)
  const [tfaError, setTfaError] = useState("")

  const [resendingEmail, setResendingEmail] = useState(false)
  const [emailResent, setEmailResent] = useState(false)

  useEffect(() => {
    setTwoFactorEnabled(user?.twoFactorEnabled ?? false)
  }, [user?.twoFactorEnabled])

  async function handleRequest2FA() {
    setTfaLoading(true)
    setTfaError("")
    try {
      const { apiCall, API_CONFIG: cfg } = await import("@/lib/api")
      const res = await apiCall<null>(cfg.ENDPOINTS.ENABLE_2FA_REQUEST, { method: "POST" })
      if (res.hasError) { setTfaError(res.message ?? "Erro ao enviar código."); return }
      set2FADialog("confirm")
    } finally {
      setTfaLoading(false)
    }
  }

  async function handleConfirm2FA() {
    if (tfaCode.length !== 6) return
    setTfaLoading(true)
    setTfaError("")
    try {
      const { apiCall, API_CONFIG: cfg } = await import("@/lib/api")
      const res = await apiCall<null>(cfg.ENDPOINTS.ENABLE_2FA_CONFIRM, {
        method: "POST",
        body: JSON.stringify({ code: tfaCode }),
      })
      if (res.hasError) { setTfaError(res.message ?? "Código inválido."); return }
      setTwoFactorEnabled(true)
      set2FADialog("idle")
      setTfaCode("")
      await refreshUser()
    } finally {
      setTfaLoading(false)
    }
  }

  async function handleDisable2FA() {
    setTfaLoading(true)
    setTfaError("")
    try {
      const { apiCall, API_CONFIG: cfg } = await import("@/lib/api")
      const res = await apiCall<null>(cfg.ENDPOINTS.DISABLE_2FA, { method: "POST" })
      if (res.hasError) { setTfaError(res.message ?? "Erro ao desativar 2FA."); return }
      setTwoFactorEnabled(false)
      set2FADialog("idle")
      await refreshUser()
    } finally {
      setTfaLoading(false)
    }
  }

  async function handleResendConfirmEmail() {
    setResendingEmail(true)
    try {
      const res = await secureApiCall(API_CONFIG.ENDPOINTS.RESEND_CONFIRM_EMAIL, { method: "POST" })
      if (res.hasError) { toast.error(res.message ?? "Erro ao reenviar e-mail."); return }
      setEmailResent(true)
      toast.success("E-mail de confirmação enviado! Verifique sua caixa de entrada.")
    } catch {
      toast.error("Erro de conexão.")
    } finally {
      setResendingEmail(false)
    }
  }

  return {
    user,
    emailConfirmed,
    twoFactorEnabled,
    tfa2Dialog,
    set2FADialog,
    tfaCode,
    setTfaCode,
    tfaLoading,
    tfaError,
    resendingEmail,
    emailResent,
    handleRequest2FA,
    handleConfirm2FA,
    handleDisable2FA,
    handleResendConfirmEmail,
  }
}
