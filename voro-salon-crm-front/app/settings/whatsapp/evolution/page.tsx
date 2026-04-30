"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import useSWR from "swr"
import { ArrowLeft, Loader2, Plus, QrCode, Smartphone, Trash2, Wifi, WifiOff } from "lucide-react"
import { toast } from "sonner"

import { API_CONFIG, secureApiCall } from "@/lib/api"
import { fetcher } from "@/lib/fetcher"
import { usePlanLimits } from "@/hooks/use-plan-limits.hook"
import { AuthGuard } from "@/components/auth/auth.guard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// ─── Types ────────────────────────────────────────────────────────────────────

interface EvolutionInstance {
  id: string
  instanceId: string
  status: 0 | 1 | 2 // 0=Disconnected, 1=Connecting, 2=Connected
  phoneNumber: string | null
  createdAt: string
  connectedAt: string | null
}

interface EvolutionStatus {
  state: string // "open" | "close" | "connecting" | "timeout"
  instanceId: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const POLLING_INTERVAL = 3000

function statusLabel(status: EvolutionInstance["status"]): {
  label: string
  variant: "default" | "secondary" | "outline"
  className: string
} {
  switch (status) {
    case 2:
      return {
        label: "Conectado",
        variant: "default",
        className:
          "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-700",
      }
    case 1:
      return {
        label: "Conectando",
        variant: "outline",
        className:
          "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-700",
      }
    default:
      return {
        label: "Desconectado",
        variant: "secondary",
        className: "text-muted-foreground",
      }
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EvolutionInstancesPage() {
  const router = useRouter()
  const { hasWhatsAppBot, isLoaded: planLoaded } = usePlanLimits()

  // Redirect if plan doesn't include WhatsApp bot
  useEffect(() => {
    if (planLoaded && !hasWhatsAppBot) {
      router.replace("/settings")
    }
  }, [planLoaded, hasWhatsAppBot, router])

  const {
    data: instances,
    isLoading,
    mutate,
  } = useSWR<EvolutionInstance[]>(API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCES, fetcher, {
    fallbackData: [],
  })

  const instance = instances?.[0] ?? null

  // ── Create ─────────────────────────────────────────────────────────────────

  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await secureApiCall<EvolutionInstance>(API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCES, {
        method: "POST",
      })
      if (res.hasError) {
        toast.error(res.message ?? "Erro ao criar instância.")
      } else {
        toast.success("Instância criada com sucesso.")
        mutate()
      }
    } finally {
      setCreating(false)
    }
  }

  // ── Delete dialog ──────────────────────────────────────────────────────────

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!instance) return
    setDeleting(true)
    try {
      const res = await secureApiCall(
        `${API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCES}/${instance.id}`,
        { method: "DELETE" }
      )
      if (res.hasError) {
        toast.error(res.message ?? "Erro ao excluir instância.")
      } else {
        toast.success("Instância excluída.")
        setDeleteOpen(false)
        mutate()
      }
    } finally {
      setDeleting(false)
    }
  }

  // ── Disconnect ─────────────────────────────────────────────────────────────

  const [disconnecting, setDisconnecting] = useState(false)

  const handleDisconnect = async () => {
    if (!instance) return
    setDisconnecting(true)
    try {
      const res = await secureApiCall(
        `${API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCES}/${instance.id}/disconnect`,
        { method: "POST" }
      )
      if (res.hasError) {
        toast.error(res.message ?? "Erro ao desconectar.")
      } else {
        toast.success("Número desconectado.")
        mutate()
      }
    } finally {
      setDisconnecting(false)
    }
  }

  // ── QR dialog ──────────────────────────────────────────────────────────────

  const [qrOpen, setQrOpen] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const qrPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const statusPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopQrPoll = () => {
    if (qrPollRef.current) {
      clearInterval(qrPollRef.current)
      qrPollRef.current = null
    }
  }

  const stopStatusPoll = () => {
    if (statusPollRef.current) {
      clearInterval(statusPollRef.current)
      statusPollRef.current = null
    }
  }

  const fetchQr = async (id: string) => {
    const res = await secureApiCall<{ qrCode: string | null }>(
      `${API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCES}/${id}/qr`
    )
    if (!res.hasError && res.data?.qrCode) {
      setQrCode(res.data.qrCode)
    }
  }

  const checkStatus = async (id: string) => {
    const res = await secureApiCall<EvolutionStatus>(
      `${API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCES}/${id}/status`
    )
    if (!res.hasError && res.data?.state === "open") {
      stopQrPoll()
      stopStatusPoll()
      setQrOpen(false)
      toast.success("WhatsApp conectado com sucesso.")
      mutate()
    }
  }

  const handleOpenQr = async () => {
    if (!instance) return
    setQrCode(null)
    setQrLoading(true)
    setQrOpen(true)

    await fetchQr(instance.id)
    setQrLoading(false)

    qrPollRef.current = setInterval(() => fetchQr(instance.id), POLLING_INTERVAL)
    statusPollRef.current = setInterval(() => checkStatus(instance.id), POLLING_INTERVAL)
  }

  const handleCloseQr = () => {
    stopQrPoll()
    stopStatusPoll()
    setQrOpen(false)
  }

  // ── Pairing code dialog ────────────────────────────────────────────────────

  const [pairOpen, setPairOpen] = useState(false)
  const [pairPhone, setPairPhone] = useState("")
  const [pairCode, setPairCode] = useState<string | null>(null)
  const [pairLoading, setPairLoading] = useState(false)
  const pairStatusRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPairStatusPoll = () => {
    if (pairStatusRef.current) {
      clearInterval(pairStatusRef.current)
      pairStatusRef.current = null
    }
  }

  const checkStatusForPair = async (id: string) => {
    const res = await secureApiCall<EvolutionStatus>(
      `${API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCES}/${id}/status`
    )
    if (!res.hasError && res.data?.state === "open") {
      stopPairStatusPoll()
      setPairOpen(false)
      toast.success("WhatsApp conectado com sucesso.")
      mutate()
    }
  }

  const handleGeneratePairCode = async () => {
    if (!instance || !pairPhone.trim()) return
    setPairLoading(true)
    setPairCode(null)
    try {
      const res = await secureApiCall<{ pairingCode: string }>(
        `${API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCES}/${instance.id}/pair`,
        {
          method: "POST",
          body: JSON.stringify({ phone: pairPhone.trim() }),
        }
      )
      if (res.hasError) {
        toast.error(res.message ?? "Erro ao gerar código.")
      } else {
        setPairCode(res.data?.pairingCode ?? null)
        pairStatusRef.current = setInterval(
          () => checkStatusForPair(instance.id),
          POLLING_INTERVAL
        )
      }
    } finally {
      setPairLoading(false)
    }
  }

  const handleClosePair = () => {
    stopPairStatusPoll()
    setPairOpen(false)
    setPairPhone("")
    setPairCode(null)
  }

  // ── Polling de status (status=Connecting) ──────────────────────────────────

  useEffect(() => {
    if (!instance || instance.status !== 1) return

    const id = setInterval(async () => {
      const res = await secureApiCall<EvolutionStatus>(
        `${API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCES}/${instance.id}/status`
      )
      if (!res.hasError && res.data?.state === "open") {
        mutate()
      }
    }, POLLING_INTERVAL)

    return () => clearInterval(id)
  }, [instance?.id, instance?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup on unmount ─────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      stopQrPoll()
      stopStatusPoll()
      stopPairStatusPoll()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <AuthGuard requiredRoles={["SalonOwner", "Owner"]}>
      <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/settings?tab=whatsapp">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Conexão Evolution Go
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gerencie sua instância WhatsApp via Evolution Go.
            </p>
          </div>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <Card>
            <CardContent className="p-6 flex flex-col gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-8 w-full animate-pulse rounded bg-muted" />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!isLoading && !instance && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Wifi className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-semibold text-foreground">Nenhuma instância criada</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Crie uma instância Evolution Go para conectar um número WhatsApp alternativo ao
                  bot.
                </p>
              </div>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Criar instância
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Instance card */}
        {!isLoading && instance && (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-base">Instância Evolution Go</CardTitle>
                  <CardDescription>
                    <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                      {instance.instanceId}
                    </code>
                  </CardDescription>
                </div>
                {(() => {
                  const s = statusLabel(instance.status)
                  return (
                    <Badge variant={s.variant} className={s.className}>
                      {instance.status === 1 && (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      )}
                      {s.label}
                    </Badge>
                  )
                })()}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Details */}
              <div className="flex flex-col gap-2 text-sm">
                {instance.phoneNumber && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Smartphone className="h-4 w-4 shrink-0" />
                    <span className="font-mono">{instance.phoneNumber}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-xs">Criado em {formatDate(instance.createdAt)}</span>
                </div>
                {instance.connectedAt && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-xs">
                      Conectado em {formatDate(instance.connectedAt)}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {instance.status !== 2 && (
                  <>
                    <Button size="sm" onClick={handleOpenQr}>
                      <QrCode className="mr-2 h-4 w-4" />
                      Conectar via QR
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPairOpen(true)}>
                      <Smartphone className="mr-2 h-4 w-4" />
                      Conectar via Código
                    </Button>
                  </>
                )}
                {instance.status === 2 && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                  >
                    {disconnecting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <WifiOff className="mr-2 h-4 w-4" />
                    )}
                    Desconectar
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive ml-auto"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir instância
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── QR Code Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={qrOpen} onOpenChange={(open) => !open && handleCloseQr()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Conectar via QR Code
            </DialogTitle>
            <DialogDescription>
              Abra o WhatsApp no celular, vá em Dispositivos Conectados e escaneie o QR abaixo.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-center min-h-[220px]">
            {qrLoading || !qrCode ? (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="text-sm">Aguardando QR Code...</span>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:image/png;base64,${qrCode}`}
                alt="QR Code WhatsApp"
                className="w-52 h-52 rounded-lg border"
              />
            )}
          </div>

          <p className="text-xs text-center text-muted-foreground">
            O QR Code atualiza automaticamente. A janela fecha ao detectar conexão.
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseQr} className="w-full">
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Pairing Code Dialog ────────────────────────────────────────────── */}
      <Dialog open={pairOpen} onOpenChange={(open) => !open && handleClosePair()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              Conectar via Código
            </DialogTitle>
            <DialogDescription>
              Digite o número completo com DDI (ex: +5511999999999) para receber um código de
              pareamento no WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="pair-phone">Número de telefone</Label>
              <Input
                id="pair-phone"
                placeholder="+5511999999999"
                value={pairPhone}
                onChange={(e) => setPairPhone(e.target.value)}
                disabled={pairLoading || !!pairCode}
              />
            </div>

            {pairCode && (
              <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted border">
                <p className="text-xs text-muted-foreground">Código de pareamento</p>
                <p className="text-3xl font-mono font-bold tracking-widest text-foreground select-all">
                  {pairCode}
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  Digite este código no WhatsApp em Dispositivos Conectados &gt; Vincular com
                  número de telefone.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={handleClosePair} disabled={pairLoading}>
              Cancelar
            </Button>
            {!pairCode && (
              <Button
                onClick={handleGeneratePairCode}
                disabled={pairLoading || !pairPhone.trim()}
              >
                {pairLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Gerar Código
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ─────────────────────────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Excluir instância?
            </DialogTitle>
            <DialogDescription>
              A instância será removida permanentemente e o número será desconectado. Esta ação
              não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthGuard>
  )
}
