"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { API_CONFIG, apiCall } from "@/lib/api"
import { TrialState } from "@/components/features/landing/feedback/trial-state"
import { NotFoundState } from "@/components/features/landing/feedback/not-found-state"
import { LoadingState } from "@/components/features/landing/feedback/loading-state"
import { ErrorState } from "@/components/features/landing/feedback/error-state"
import { SuccessState } from "@/components/features/landing/feedback/success-state"

type Status = "loading" | "success" | "trial" | "error" | "not_found"

export default function PagarSucessoPage() {
  const searchParams = useSearchParams()
  const preapprovalId = searchParams.get("preapproval_id")
  const isTrial = searchParams.get("trial") === "true"
  const [status, setStatus] = useState<Status>(() => {
    if (isTrial) return "trial"
    if (preapprovalId) return "loading"
    return "not_found"
  })
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!preapprovalId || isTrial) return

    apiCall<null>(`${API_CONFIG.ENDPOINTS.SUBSCRIPTION_CONFIRM}/${preapprovalId}`, {
      method: "POST",
    }).then((res) => {
      if (res.hasError) {
        setErrorMsg(res.message ?? "Erro ao confirmar assinatura.")
        setStatus("error")
      } else {
        setStatus("success")
      }
    })
  }, [preapprovalId, isTrial])

  if (status === "trial") return <TrialState />
  if (status === "not_found") return <NotFoundState />
  if (status === "loading") return <LoadingState />
  if (status === "error") return <ErrorState errorMsg={errorMsg} />
  return <SuccessState />
}
