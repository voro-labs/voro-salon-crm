"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useTheme } from "next-themes"
import {
  Save,
  Loader2,
  Building2,
  Palette,
  Moon,
  Sun,
  Monitor,
  Download,
  Phone,
  Mail,
  Sliders,
  Upload,
  Image as ImageIcon,
  X,
  LayoutGrid,
  ClipboardList,
  ChevronRight,
  CreditCard,
  Shield,
  ShieldCheck,
  ShieldOff,
  Clock,
  MessageCircle,
  MessageSquare,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertTriangle,
  Home,
  Calendar,
  Users,
  DollarSign,
  Plus,
  Trash2,
  QrCode,
  Smartphone,
} from "lucide-react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Badge } from "@/components/ui/badge"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { refreshTenantTheme } from "@/contexts/tenant-theme.context"
import { AuthGuard } from "@/components/auth/auth.guard"
import { useAuth } from "@/contexts/auth.context"
import { useSettings } from "@/hooks/use-settings.hook"
import { usePlanLimits } from "@/hooks/use-plan-limits.hook"
import { PhoneInput } from "@/components/ui/custom/phone-input"
import { CountrySelector } from "@/components/ui/custom/country-selector"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EstablishmentType } from "@/types/Enums/establishmentType.enum"
import { getBrandingByType } from "@/lib/branding"
import { AuthenticatedImage } from "@/components/ui/custom/authenticated-image"
import { toast } from "sonner"

interface EvolutionInstance {
  id: string
  instanceId: string
  status: 0 | 1 | 2 // 0=Disconnected, 1=Connecting, 2=Connected
  phoneNumber: string | null
  connectedAt: string | null
  isOwned: boolean
  ownerTenantName: string | null
}

interface AvailableInstance {
  instanceId: string
  tenantName: string
  phoneNumber: string | null
  status: 0 | 1 | 2
}

interface EvolutionStatus {
  state: string
  instanceId: string
}

const EVOLUTION_STATUS_INTERVAL = 30_000 // background live-status sync

interface OnboardingStatus {
  connected: boolean
  displayPhone: string | null
  businessAccountId: string | null
  tokenExpiresAt: string | null
}

interface OnboardingConfig {
  appId: string
  configId: string
}

const fetchOnboardingStatus = async (url: string): Promise<OnboardingStatus | null> => {
  const res = await secureApiCall<OnboardingStatus>(url)
  if (res.hasError) return null
  return res.data ?? null
}

interface TenantData {
  id: string
  slug: string
  name: string
  logoUrl: string | null
  primaryColor: string | null
  secondaryColor: string | null
  contactPhone: string | null
  contactEmail: string | null
  themeMode: string
  establishmentType: number
}

const COLOR_PRESETS = [
  { label: "Rosa Salão", primary: "#e11d48", secondary: "#f43f5e" },
  { label: "Roxo Elegante", primary: "#7c3aed", secondary: "#a855f7" },
  { label: "Marrom Clássico", primary: "#8B4513", secondary: "#A0522D" },
  { label: "Verde Esmeralda", primary: "#059669", secondary: "#10b981" },
  { label: "Azul Profissional", primary: "#1d4ed8", secondary: "#3b82f6" },
  { label: "Dourado Premium", primary: "#b45309", secondary: "#d97706" },
  { label: "Carbono", primary: "#374151", secondary: "#6b7280" },
  { label: "Coral", primary: "#dc4f2f", secondary: "#f97316" },
]

const RADIUS_PRESETS = [
  { label: "Quadrado", value: "0rem" },
  { label: "Suave", value: "0.375rem" },
  { label: "Padrão", value: "0.625rem" },
  { label: "Arredondado", value: "1rem" },
  { label: "Pill", value: "1.5rem" },
]

const DEFAULT_PAGE_OPTIONS = [
  { value: "/", label: "Dashboard", icon: Home },
  { value: "/appointments", label: "Agendamentos", icon: Calendar },
  { value: "/clients", label: "Clientes", icon: Users },
  { value: "/finance", label: "Finanças", icon: DollarSign },
]


function applyRadius(value: string) {
  document.documentElement.style.setProperty("--radius", value)
  try { localStorage.setItem("voro:radius", value) } catch { }
}


export default function ConfiguracoesPage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [currentRadius, setCurrentRadius] = useState("0.625rem")
  const [defaultPage, setDefaultPage] = useState("/")
  const [appointmentViewMode, setAppointmentViewMode] = useState("list")
  const { user, refreshUser } = useAuth()
  const { planName, hasWhatsAppBot, hasAnamnesis } = usePlanLimits()

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled ?? false)
  const [tfa2Dialog, set2FADialog] = useState<"idle" | "request" | "confirm" | "disable">("idle")
  const [tfaCode, setTfaCode] = useState("")
  const [tfaLoading, setTfaLoading] = useState(false)
  const [tfaError, setTfaError] = useState("")

  // WhatsApp config state
  const [wpPhoneNumberId, setWpPhoneNumberId] = useState("")
  const [wpBusinessAccountId, setWpBusinessAccountId] = useState("")
  const [useWhatsappBooking, setUseWhatsappBooking] = useState(false)
  const [savingWp, setSavingWp] = useState(false)

  // WhatsApp Embedded Signup state
  const { data: onboardingStatus, isLoading: statusLoading, mutate: mutateStatus } = useSWR<OnboardingStatus | null>(
    API_CONFIG.ENDPOINTS.WHATSAPP_ONBOARDING_STATUS,
    fetchOnboardingStatus,
    { fallbackData: null }
  )
  const { data: evolutionInstances, isLoading: isLoadingEvolution, mutate: mutateEvolution } = useSWR<EvolutionInstance[]>(
    hasWhatsAppBot ? API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCES : null,
    fetcher,
    { fallbackData: [] }
  )
  const evolutionInstance = evolutionInstances?.[0] ?? null
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false)

  const [evolutionLiveState, setEvolutionLiveState] = useState<string | null>(null)
  const evolutionInstanceRef = useRef(evolutionInstance)
  useEffect(() => { evolutionInstanceRef.current = evolutionInstance }, [evolutionInstance])

  // Sub-tabs WhatsApp
  const [whatsappSubTab, setWhatsappSubTab] = useState<"evolution" | "official">("evolution")

  // Modal criar/vincular instância
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [availableInstances, setAvailableInstances] = useState<AvailableInstance[]>([])
  const [loadingAvailable, setLoadingAvailable] = useState(false)
  const [selectedLinkInstanceId, setSelectedLinkInstanceId] = useState<string | null>(null)
  const [linkChoice, setLinkChoice] = useState<"new" | "link">("new")
  const [linking, setLinking] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const [creating, setCreating] = useState(false)

  // Exclusão de instância Evolution
  const [deleteOpen, setDeleteOpen] = useState(false)

  // QR code inline
  const [qrExpanded, setQrExpanded] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const qrPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Código de pareamento inline
  const [codeExpanded, setCodeExpanded] = useState(false)
  const [pairPhone, setPairPhone] = useState("")
  const [pairCode, setPairCode] = useState<string | null>(null)
  const [pairLoading, setPairLoading] = useState(false)
  const pairPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const evolutionEffectiveStatus: 0 | 1 | 2 = (() => {
    if (!evolutionInstance) return 0
    if (evolutionLiveState === "open") return 2
    if (evolutionLiveState === "connecting") return 1
    if (evolutionLiveState === "close" || evolutionLiveState === "timeout") return 0
    return evolutionInstance.status
  })()

  const evolutionIsActive = evolutionEffectiveStatus === 2 || (evolutionInstance != null && !evolutionInstance.isOwned)
  const officialIsActive = onboardingStatus?.connected === true

  useEffect(() => {
    setTwoFactorEnabled(user?.twoFactorEnabled ?? false)
  }, [user?.twoFactorEnabled])

  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")

  const roleNames = user?.roles?.map((r) => r.name) ?? []
  const isOwner = roleNames.includes("Owner")
  const isSalonOwner = roleNames.includes("SalonOwner") || isOwner
  
  const defaultTab = isSalonOwner ? "geral" : "aparencia"

  // Sanitize tab param: if the requested tab requires a plan feature the user doesn't have, fallback to default
  const resolvedTab = (() => {
    if (!tabParam) return defaultTab
    if (tabParam === "anamnesis" && !hasAnamnesis) return defaultTab
    if (tabParam === "whatsapp" && !hasWhatsAppBot) return defaultTab
    return tabParam
  })()
  const activeTab = resolvedTab

  const {
    tenant,
    modules,
    form,
    setForm,
    formData,
    countryCode,
    setCountryCode,
    isLoading,
    isSaving: saving,
    isUploadingLogo: uploadingLogo,
    isExportingClients: exportingClients,
    isExportingServices: exportingServices,
    handlePreset,
    setEstablishmentType,
    saveTenant,
    handleLogoUpload,
    exportData: handleExport,
    updateModule: handleModuleUpdate,
  } = useSettings()

  useEffect(() => {
    if (tenant) {
      if (tenant.defaultPage) setDefaultPage(tenant.defaultPage)
      if (tenant.appointmentViewMode) setAppointmentViewMode(tenant.appointmentViewMode)
    }
  }, [tenant])

  useEffect(() => {
    if (tenant && !wpPhoneNumberId && !wpBusinessAccountId) {
      setWpPhoneNumberId(tenant.whatsappPhoneNumberId ?? "")
      setWpBusinessAccountId(tenant.whatsappBusinessAccountId ?? "")
      setUseWhatsappBooking(tenant.useWhatsappBooking ?? false)
    }
  }, [tenant]) // eslint-disable-line react-hooks/exhaustive-deps

  // Polling de status em tempo real para a instância Evolution Go
  useEffect(() => {
    if (!evolutionInstance) return

    const poll = async () => {
      const res = await secureApiCall<EvolutionStatus>(
        `${API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCES}/${evolutionInstanceRef.current!.id}/status`
      )
      if (!res.hasError && res.data?.state) {
        setEvolutionLiveState(res.data.state)
      } else if (res.hasError) {
        setEvolutionLiveState(null)
      }
    }

    poll()
    const intervalId = setInterval(poll, EVOLUTION_STATUS_INTERVAL)
    return () => clearInterval(intervalId)
  }, [evolutionInstance?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup: limpar polls de QR e código ao desmontar o componente
  useEffect(() => {
    return () => {
      if (qrPollRef.current) clearInterval(qrPollRef.current)
      if (pairPollRef.current) clearInterval(pairPollRef.current)
    }
  }, [])

  // Reset QR/pair state quando instância Evolution muda
  useEffect(() => {
    if (qrPollRef.current) clearInterval(qrPollRef.current)
    if (pairPollRef.current) clearInterval(pairPollRef.current)
    setQrExpanded(false)
    setQrCode(null)
    setCodeExpanded(false)
    setPairPhone("")
    setPairCode(null)
  }, [evolutionInstance?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleConnect = useCallback(async () => {
    setConnecting(true)
    try {
      const configRes = await secureApiCall<OnboardingConfig>(API_CONFIG.ENDPOINTS.WHATSAPP_ONBOARDING_CONFIG)
      if (configRes.hasError || !configRes.data) {
        toast.error("Erro ao obter configuração do WhatsApp.")
        return
      }
      const { appId, configId } = configRes.data
      const extras = encodeURIComponent(JSON.stringify({ sessionInfoVersion: "3", version: "v4" }))
      const url = `https://business.facebook.com/messaging/whatsapp/onboard/?app_id=${appId.trim()}&config_id=${configId.trim()}&extras=${extras}`
      const popup = window.open(url, "wa_signup", "width=800,height=700,scrollbars=yes")
      if (!popup) {
        toast.error("Popup bloqueado. Permita popups para este site e tente novamente.")
        return
      }
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== "https://business.facebook.com") return
        try {
          const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data
          if (data?.type !== "WA_EMBEDDED_SIGNUP") return
          if (data.event === "FINISH") {
            const { code, waba_id } = data.data ?? {}
            if (code && waba_id) {
              popup.close()
              window.removeEventListener("message", handleMessage)
              const exchangeRes = await secureApiCall(API_CONFIG.ENDPOINTS.WHATSAPP_ONBOARDING_EXCHANGE, {
                method: "POST",
                body: JSON.stringify({ code, wabaId: waba_id }),
              })
              if (exchangeRes.hasError) {
                toast.error(exchangeRes.message ?? "Erro ao conectar WhatsApp.")
              } else {
                toast.success("WhatsApp Business conectado com sucesso!")
                mutateStatus()
              }
              setConnecting(false)
            }
          } else if (data.event === "CANCEL" || data.event === "ERROR") {
            popup.close()
            window.removeEventListener("message", handleMessage)
            toast.error("Conexão com WhatsApp cancelada.")
            setConnecting(false)
          }
        } catch { /* ignore */ }
      }
      window.addEventListener("message", handleMessage)
      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer)
          window.removeEventListener("message", handleMessage)
          setConnecting(false)
        }
      }, 500)
    } catch {
      toast.error("Erro de conexão.")
      setConnecting(false)
    }
  }, [mutateStatus])

  const handleDisconnectWa = async () => {
    setDisconnecting(true)
    try {
      const res = await secureApiCall(API_CONFIG.ENDPOINTS.WHATSAPP_ONBOARDING_DISCONNECT, { method: "DELETE" })
      if (res.hasError) {
        toast.error(res.message ?? "Erro ao desconectar.")
      } else {
        toast.success("WhatsApp desconectado.")
        mutateStatus()
      }
    } catch {
      toast.error("Erro de conexão.")
    } finally {
      setDisconnecting(false)
      setDisconnectDialogOpen(false)
    }
  }

  const handleSaveWhatsapp = async () => {
    setSavingWp(true)
    try {
      const { secureApiCall: call, API_CONFIG: cfg } = await import("@/lib/api")
      const res = await call(cfg.ENDPOINTS.TENANT_ME, {
        method: "PATCH",
        body: JSON.stringify({
          whatsappPhoneNumberId: wpPhoneNumberId || null,
          whatsappBusinessAccountId: wpBusinessAccountId || null,
          useWhatsappBooking: useWhatsappBooking
        }),
      })
      if (res.hasError) {
        toast.error(res.message ?? "Erro ao salvar configuração do WhatsApp.")
      } else {
        toast.success("Configuração do WhatsApp salva com sucesso!")
      }
    } catch {
      toast.error("Erro de conexão.")
    } finally {
      setSavingWp(false)
    }
  }

  // ── Evolution: criar instância ──
  const handleCreateInstance = async () => {
    setCreating(true)
    try {
      const res = await secureApiCall<EvolutionInstance>(API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCES, { method: "POST" })
      if (res.hasError) { toast.error(res.message ?? "Erro ao criar instância."); return }
      toast.success("Instância criada.")
      mutateEvolution()
    } finally {
      setCreating(false)
    }
  }

  // ── Evolution: desconectar ──
  const handleDisconnect = async () => {
    if (!evolutionInstance) return
    setDisconnecting(true)
    try {
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCES}/${evolutionInstance.id}/disconnect`, { method: "POST" })
      if (res.hasError) { toast.error(res.message ?? "Erro ao desconectar."); return }
      toast.success("Instância desconectada.")
      setEvolutionLiveState(null)
      mutateEvolution()
    } finally {
      setDisconnecting(false)
    }
  }

  // ── Evolution: excluir instância ──
  const handleDeleteEvolution = async () => {
    if (!evolutionInstance) return
    setDeleteOpen(false)
    try {
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCES}/${evolutionInstance.id}`, { method: "DELETE" })
      if (res.hasError) { toast.error(res.message ?? "Erro ao excluir instância."); return }
      toast.success("Instância excluída.")
      mutateEvolution()
    } catch {
      toast.error("Erro de conexão.")
    }
  }

  // ── Evolution: abrir modal de criação/vinculação ──
  const handleOpenLinkModal = async () => {
    setLoadingAvailable(true)
    setLinkModalOpen(true)
    setLinkChoice("new")
    setSelectedLinkInstanceId(null)
    try {
      const res = await secureApiCall<AvailableInstance[]>(API_CONFIG.ENDPOINTS.EVOLUTION_AVAILABLE_TO_LINK)
      setAvailableInstances(res.hasError ? [] : res.data ?? [])
    } finally {
      setLoadingAvailable(false)
    }
  }

  // ── Evolution: confirmar modal (criar ou vincular) ──
  const handleConfirmLinkModal = async () => {
    setLinking(true)
    try {
      if (linkChoice === "new") {
        const res = await secureApiCall<EvolutionInstance>(API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCES, { method: "POST" })
        if (res.hasError) { toast.error(res.message ?? "Erro ao criar instância."); return }
        toast.success("Instância criada.")
      } else {
        if (!selectedLinkInstanceId) return
        const res = await secureApiCall(API_CONFIG.ENDPOINTS.EVOLUTION_LINK, {
          method: "POST",
          body: JSON.stringify({ instanceId: selectedLinkInstanceId }),
        })
        if (res.hasError) { toast.error(res.message ?? "Erro ao vincular."); return }
        toast.success("Instância vinculada.")
      }
      mutateEvolution()
      setLinkModalOpen(false)
    } finally {
      setLinking(false)
    }
  }

  // ── Evolution: desvincular instância compartilhada ──
  const handleUnlink = async () => {
    setUnlinking(true)
    try {
      const res = await secureApiCall(API_CONFIG.ENDPOINTS.EVOLUTION_LINK, { method: "DELETE" })
      if (res.hasError) { toast.error(res.message ?? "Erro ao desvincular."); return }
      toast.success("Instância desvinculada.")
      mutateEvolution()
    } finally {
      setUnlinking(false)
    }
  }

  // ── QR Code inline ──
  const handleToggleQr = async () => {
    if (qrExpanded) {
      if (qrPollRef.current) clearInterval(qrPollRef.current)
      setQrExpanded(false)
      setQrCode(null)
      return
    }
    if (!evolutionInstance) return
    setQrExpanded(true)
    setQrLoading(true)
    setCodeExpanded(false)
    setPairCode(null)

    const fetchQr = async () => {
      const res = await secureApiCall<{ qrCode: string | null }>(
        `${API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCES}/${evolutionInstanceRef.current!.id}/qr`
      )
      if (!res.hasError && res.data?.qrCode) setQrCode(res.data.qrCode)
    }

    const checkStatus = async () => {
      const res = await secureApiCall<EvolutionStatus>(
        `${API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCES}/${evolutionInstanceRef.current!.id}/status`
      )
      if (!res.hasError && res.data?.state === "open") {
        if (qrPollRef.current) clearInterval(qrPollRef.current)
        setQrExpanded(false)
        setQrCode(null)
        toast.success("WhatsApp conectado!")
        mutateEvolution()
      }
    }

    await fetchQr()
    setQrLoading(false)
    qrPollRef.current = setInterval(async () => { await fetchQr(); await checkStatus() }, 3000)
  }

  // ── Código de pareamento inline ──
  const handleGeneratePairCodeInline = async () => {
    if (!evolutionInstance || !pairPhone.trim()) return
    setPairLoading(true)
    setPairCode(null)
    try {
      const res = await secureApiCall<{ pairingCode: string }>(
        `${API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCES}/${evolutionInstance.id}/pair`,
        { method: "POST", body: JSON.stringify({ phone: pairPhone.trim() }) }
      )
      if (res.hasError) { toast.error(res.message ?? "Erro ao gerar código."); return }
      setPairCode(res.data?.pairingCode ?? null)
      pairPollRef.current = setInterval(async () => {
        const statusRes = await secureApiCall<EvolutionStatus>(
          `${API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCES}/${evolutionInstanceRef.current!.id}/status`
        )
        if (!statusRes.hasError && statusRes.data?.state === "open") {
          if (pairPollRef.current) clearInterval(pairPollRef.current)
          setCodeExpanded(false)
          setPairPhone("")
          setPairCode(null)
          toast.success("WhatsApp conectado!")
          mutateEvolution()
        }
      }, 3000)
    } finally {
      setPairLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    const saved = typeof window !== "undefined" ? localStorage.getItem("voro:radius") : null
    if (saved) setCurrentRadius(saved)
  }, [])

  const handleRadiusChange = useCallback((value: string) => {
    setCurrentRadius(value)
    applyRadius(value)
  }, [])

  const handleDefaultPageChange = useCallback(async (value: string) => {
    setDefaultPage(value)
    try {
      await secureApiCall(API_CONFIG.ENDPOINTS.TENANT_ME, {
        method: "PATCH",
        body: JSON.stringify({ defaultPage: value }),
      })
    } catch { }
  }, [])

  const handleAppointmentViewModeChange = useCallback(async (value: string) => {
    setAppointmentViewMode(value)
    try {
      await secureApiCall(API_CONFIG.ENDPOINTS.TENANT_ME, {
        method: "PATCH",
        body: JSON.stringify({ appointmentViewMode: value }),
      })
    } catch { }
  }, [])


  const handleRequest2FA = async () => {
    setTfaLoading(true)
    setTfaError("")
    try {
      const { apiCall, API_CONFIG } = await import("@/lib/api")
      const res = await apiCall<null>(API_CONFIG.ENDPOINTS.ENABLE_2FA_REQUEST, { method: "POST" })
      if (res.hasError) { setTfaError(res.message ?? "Erro ao enviar código."); return }
      set2FADialog("confirm")
    } finally {
      setTfaLoading(false)
    }
  }

  const handleConfirm2FA = async () => {
    if (tfaCode.length !== 6) return
    setTfaLoading(true)
    setTfaError("")
    try {
      const { apiCall, API_CONFIG } = await import("@/lib/api")
      const res = await apiCall<null>(API_CONFIG.ENDPOINTS.ENABLE_2FA_CONFIRM, {
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

  const handleDisable2FA = async () => {
    setTfaLoading(true)
    setTfaError("")
    try {
      const { apiCall, API_CONFIG } = await import("@/lib/api")
      const res = await apiCall<null>(API_CONFIG.ENDPOINTS.DISABLE_2FA, { method: "POST" })
      if (res.hasError) { setTfaError(res.message ?? "Erro ao desativar 2FA."); return }
      setTwoFactorEnabled(false)
      set2FADialog("idle")
      await refreshUser()
    } finally {
      setTfaLoading(false)
    }
  }

  const EvolutionSubTab = () => {
    if (isLoadingEvolution) return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )

    // Estado: instância compartilhada (vinculada)
    if (evolutionInstance && !evolutionInstance.isOwned) return (
      <div className={`rounded-lg border p-4 flex flex-col gap-3 ${evolutionEffectiveStatus === 2 ? "border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/10" : ""}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={`font-semibold text-sm ${evolutionEffectiveStatus === 2 ? "text-emerald-700" : "text-muted-foreground"}`}>
              {evolutionEffectiveStatus === 2 ? "● Conectado" : "○ Desconectado"}
            </p>
            {evolutionInstance.phoneNumber && <p className="text-sm font-mono mt-1">{evolutionInstance.phoneNumber}</p>}
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className="bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/30 gap-1 text-xs">🔗 Compartilhada</Badge>
            <span className="text-xs text-muted-foreground">de: {evolutionInstance.ownerTenantName}</span>
          </div>
        </div>
        <div className="border-t pt-3 flex justify-end">
          <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs" onClick={handleUnlink} disabled={unlinking}>
            {unlinking ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : null}
            Desvincular
          </Button>
        </div>
      </div>
    )

    // Estado: sem instância
    if (!evolutionInstance) {
      const hasAvailable = availableInstances.length > 0
      return (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Wifi className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold">Nenhuma instância configurada</p>
            <p className="text-sm text-muted-foreground max-w-xs mt-1">
              {hasAvailable
                ? "Crie uma instância ou vincule uma existente de outro estabelecimento seu."
                : "Crie uma instância Evolution Go para conectar um número WhatsApp ao bot."}
            </p>
          </div>
          <Button onClick={hasAvailable ? handleOpenLinkModal : handleCreateInstance} disabled={creating}>
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            {hasAvailable ? "Criar / Vincular instância" : "Criar instância"}
          </Button>
        </div>
      )
    }

    // Estado: instância própria (conectada, conectando ou desconectada)
    return (
      <div className={`rounded-lg border p-4 flex flex-col gap-4 ${evolutionEffectiveStatus === 2 ? "border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/10" : ""}`}>
        {/* Status header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              {evolutionEffectiveStatus === 2
                ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 gap-1 text-xs"><CheckCircle className="h-3 w-3" /> Conectado</Badge>
                : evolutionEffectiveStatus === 1
                  ? <Badge className="bg-amber-50 text-amber-700 border-amber-300 gap-1 text-xs"><Loader2 className="h-3 w-3 animate-spin" /> Conectando</Badge>
                  : <Badge variant="outline" className="text-muted-foreground text-xs">Desconectado</Badge>}
            </div>
            {evolutionInstance.phoneNumber && <p className="text-sm font-mono font-semibold mt-1">{evolutionInstance.phoneNumber}</p>}
            <p className="text-xs font-mono text-muted-foreground mt-0.5">{evolutionInstance.instanceId}</p>
          </div>
          {evolutionEffectiveStatus === 2 && (
            <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs shrink-0" onClick={handleDisconnect} disabled={disconnecting}>
              {disconnecting ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <WifiOff className="mr-1.5 h-3 w-3" />}
              Desconectar
            </Button>
          )}
        </div>

        {/* Ações de conexão (apenas quando desconectado) */}
        {evolutionEffectiveStatus !== 2 && (
          <div className="flex flex-col gap-3 pt-2 border-t">
            {/* QR Code inline */}
            <div>
              <Button size="sm" variant={qrExpanded ? "default" : "outline"} onClick={handleToggleQr} className="text-xs w-full justify-start">
                <QrCode className="mr-2 h-3.5 w-3.5" />
                {qrExpanded ? "Fechar QR Code" : "Conectar via QR Code"}
              </Button>
              {qrExpanded && (
                <div className="mt-3 flex flex-col items-center gap-3 p-4 bg-muted rounded-lg">
                  {qrLoading || !qrCode
                    ? <div className="flex flex-col items-center gap-2 py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /><span className="text-xs text-muted-foreground">Aguardando QR Code...</span></div>
                    // eslint-disable-next-line @next/next/no-img-element
                    : <img src={qrCode} alt="QR Code" className="w-48 h-48 rounded border" />}
                  <p className="text-xs text-muted-foreground text-center">Abra o WhatsApp → Dispositivos Conectados → Escanear QR</p>
                </div>
              )}
            </div>

            {/* Código de pareamento inline */}
            <div>
              <Button size="sm" variant={codeExpanded ? "default" : "outline"} onClick={() => { setCodeExpanded(v => !v); setQrExpanded(false) }} className="text-xs w-full justify-start">
                <Smartphone className="mr-2 h-3.5 w-3.5" />
                {codeExpanded ? "Fechar Código" : "Conectar via Código"}
              </Button>
              {codeExpanded && (
                <div className="mt-3 flex flex-col gap-3 p-4 bg-muted rounded-lg">
                  <div className="flex gap-2">
                    <Input placeholder="+5511999999999" value={pairPhone} onChange={e => setPairPhone(e.target.value)} disabled={pairLoading || !!pairCode} className="h-8 text-sm" />
                    {!pairCode && (
                      <Button size="sm" onClick={handleGeneratePairCodeInline} disabled={pairLoading || !pairPhone.trim()} className="h-8 text-xs shrink-0">
                        {pairLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Gerar"}
                      </Button>
                    )}
                  </div>
                  {pairCode && (
                    <div className="flex flex-col items-center gap-1 p-3 bg-background rounded border">
                      <p className="text-xs text-muted-foreground">Código de pareamento</p>
                      <p className="text-2xl font-mono font-bold tracking-widest select-all">{pairCode}</p>
                      <p className="text-xs text-muted-foreground text-center">WhatsApp → Dispositivos → Vincular com número</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Excluir instância */}
        <div className="flex justify-end pt-1 border-t">
          <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />Excluir instância
          </Button>
        </div>
      </div>
    )
  }

  const OfficialApiSubTab = () => (
    <div className={`rounded-lg border p-4 flex flex-col gap-3 transition-colors ${onboardingStatus?.connected ? "border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/10 dark:border-emerald-800" : "bg-muted/20"}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${onboardingStatus?.connected ? "bg-emerald-100 dark:bg-emerald-950/40" : "bg-muted"}`}>
            {statusLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : onboardingStatus?.connected ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <WifiOff className="h-4 w-4 text-muted-foreground" />}
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight">API Oficial Meta</p>
            <p className="text-xs text-muted-foreground">WhatsApp Business Platform</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!statusLoading && (onboardingStatus?.connected
            ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400 gap-1 text-xs"><CheckCircle className="h-3 w-3" /> Conectado</Badge>
            : <Badge variant="outline" className="text-muted-foreground text-xs">Desconectado</Badge>
          )}
          {onboardingStatus?.connected ? (
            <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive h-8 text-xs" onClick={() => setDisconnectDialogOpen(true)} disabled={disconnecting || statusLoading}>
              {disconnecting ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <WifiOff className="mr-1.5 h-3 w-3" />}
              Desconectar
            </Button>
          ) : (
            <Button size="sm" className="h-8 text-xs" onClick={handleConnect} disabled={connecting || statusLoading}>
              {connecting ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Wifi className="mr-1.5 h-3 w-3" />}
              {connecting ? "Aguardando..." : "Conectar"}
            </Button>
          )}
        </div>
      </div>
      {onboardingStatus?.connected && (
        <div className="flex flex-col gap-1 pl-12">
          {onboardingStatus.displayPhone && <p className="text-sm font-mono text-muted-foreground">{onboardingStatus.displayPhone}</p>}
          {onboardingStatus.tokenExpiresAt && (() => {
            const d = new Date(onboardingStatus.tokenExpiresAt!)
            const diffDays = Math.ceil((d.getTime() - Date.now()) / 86400000)
            return (
              <div className="flex items-center gap-1">
                {diffDays <= 7 && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                <p className={`text-xs ${diffDays <= 7 ? "text-amber-600" : "text-muted-foreground"}`}>
                  Token expira em {d.toLocaleDateString("pt-BR")} ({diffDays} dia{diffDays !== 1 ? "s" : ""})
                </p>
              </div>
            )
          })()}
        </div>
      )}
      {!onboardingStatus?.connected && (
        <div className="flex flex-col gap-3 pt-2 border-t">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">IDs Meta (avançado)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wp-phone-number-id" className="text-xs">Phone Number ID</Label>
              <Input id="wp-phone-number-id" placeholder="123456789012345" value={wpPhoneNumberId} onChange={e => setWpPhoneNumberId(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wp-business-account-id" className="text-xs">Business Account ID</Label>
              <Input id="wp-business-account-id" placeholder="987654321098765" value={wpBusinessAccountId} onChange={e => setWpBusinessAccountId(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
        </div>
      )}
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Configurações</h1>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 w-full animate-pulse rounded bg-muted" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <AuthGuard requiredRoles={["Owner", "SalonEmployee", "SalonOwner"]}>
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground text-balance">Configurações</h1>
        </div>

        <Tabs defaultValue={activeTab} key={activeTab} className="w-full">
          <div className="relative overflow-hidden">
            <TabsList className="w-full justify-start overflow-x-auto no-scrollbar flex-nowrap h-auto p-1 bg-muted/50">
              {isSalonOwner && (
                <TabsTrigger value="geral" className="shrink-0 py-2">
                  <Building2 className="mr-2 h-4 w-4" />
                  Estabelecimento
                </TabsTrigger>
              )}
              <TabsTrigger value="aparencia" className="shrink-0 py-2">
                <Palette className="mr-2 h-4 w-4" />
                Aparência
              </TabsTrigger>
              {isOwner && (
                <TabsTrigger value="modulos" className="shrink-0 py-2">
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  Módulos
                </TabsTrigger>
              )}
              {isSalonOwner && (
                <TabsTrigger value="horarios" className="shrink-0 py-2">
                  <Clock className="mr-2 h-4 w-4" />
                  Horários
                </TabsTrigger>
              )}
              {isSalonOwner && hasAnamnesis && (
                <TabsTrigger value="anamnesis" className="shrink-0 py-2">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Anamnese
                </TabsTrigger>
              )}
              {isSalonOwner && (
                <TabsTrigger value="assinaturas" className="shrink-0 py-2">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Assinaturas
                </TabsTrigger>
              )}
              {isSalonOwner && hasWhatsAppBot && (
                <TabsTrigger value="whatsapp" className="shrink-0 py-2">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp
                </TabsTrigger>
              )}
              <TabsTrigger value="seguranca" className="shrink-0 py-2">
                <Shield className="mr-2 h-4 w-4" />
                Segurança
              </TabsTrigger>
            </TabsList>
          </div>

          {isSalonOwner && <TabsContent value="geral">
            {/* ── Estabelecimento ── */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle>Dados do Estabelecimento</CardTitle>
                </div>
                <CardDescription>Nome, slug, logo e informações de contato do seu salão</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); saveTenant(formData) }} className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="tenant-name">Nome do Estabelecimento *</Label>
                      <Input
                        id="tenant-name"
                        placeholder="Meu Salão"
                        value={formData.name}
                        onChange={(e) => setForm((p) => p ? { ...p, name: e.target.value } : null)}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="tenant-slug">Slug *</Label>
                      <Input
                        id="tenant-slug"
                        placeholder="meu-salao"
                        value={formData.slug}
                        onChange={(e) => setForm((p) => p ? { ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') } : null)}
                      />
                    </div>
                    {isOwner && (
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="establishment-type">Tipo de Estabelecimento</Label>
                        <Select
                          value={String(formData.establishmentType)}
                          onValueChange={(v) => setEstablishmentType(Number(v))}
                      >
                        <SelectTrigger id="establishment-type" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={String(EstablishmentType.Salon)}>
                            Cabeleireiro / Salão
                          </SelectItem>
                          <SelectItem value={String(EstablishmentType.Barber)}>
                            Barbearia
                          </SelectItem>
                          <SelectItem value={String(EstablishmentType.NailsLashes)}>
                            Unhas e Cílios (Lashes)
                          </SelectItem>
                          <SelectItem value={String(EstablishmentType.EstheticsClinic)}>
                            Estética e Clínica
                          </SelectItem>
                          <SelectItem value={String(EstablishmentType.SpaMassage)}>
                            Spa e Massagem
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex flex-col gap-4">
                      <Label>Logotipo do Estabelecimento</Label>
                      <div className="flex flex-col sm:flex-row items-start gap-4">
                        {/* Preview Section */}
                        <div className="relative group w-32 h-32 rounded-lg border-2 border-dashed border-muted flex items-center justify-center overflow-hidden bg-muted/30">
                          {formData.logoUrl ? (
                            <>
                              <AuthenticatedImage
                                src={formData.logoUrl}
                                alt="Logo preview"
                                className="w-full h-full object-contain"
                              />
                              <button
                                type="button"
                                onClick={() => setForm(p => p ? { ...p, logoUrl: "" } : null)}
                                className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </>
                          ) : (
                            <ImageIcon className="h-10 w-10 text-muted-foreground" />
                          )}
                          {uploadingLogo && (
                            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 flex flex-col gap-3 w-full">
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="tenant-logo-file" className="text-xs uppercase tracking-wider text-muted-foreground">Upload de Arquivo</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                id="tenant-logo-file"
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="hidden"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => document.getElementById('tenant-logo-file')?.click()}
                                disabled={uploadingLogo}
                                className="w-full sm:w-auto"
                              >
                                <Upload className="mr-2 h-4 w-4" />
                                {formData.logoUrl ? "Alterar Logo" : "Selecionar Logo"}
                              </Button>
                              <span className="text-xs text-muted-foreground hidden sm:inline">PNG, JPG ou SVG (Máx. 2MB)</span>
                            </div>
                          </div>

                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                              <span className="bg-card px-2 text-muted-foreground">OU</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <Label htmlFor="tenant-logo-url" className="text-xs uppercase tracking-wider text-muted-foreground">URL Externa</Label>
                            <Input
                              id="tenant-logo-url"
                              type="url"
                              placeholder="https://exemplo.com/logo.png"
                              value={formData.logoUrl}
                              onChange={(e) => setForm((p) => p ? { ...p, logoUrl: e.target.value } : null)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground text-sm">Contato</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="contact-phone">Telefone / WhatsApp</Label>
                      <div className="flex gap-2">
                        <div className="shrink-0">
                          <CountrySelector
                            value={countryCode}
                            onChange={setCountryCode}
                          />
                        </div>
                        <div className="flex-1 relative">
                          <PhoneInput
                            id="contact-phone"
                            value={formData.contactPhone}
                            autoComplete="tel"
                            onChange={(v) => setForm((p) => p ? { ...p, contactPhone: v } : null)}
                            countryCode={countryCode}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="contact-email">
                        <Mail className="inline h-3.5 w-3.5 mr-1 mb-0.5" />
                        E-mail de contato
                      </Label>
                      <Input
                        id="contact-email"
                        type="email"
                        placeholder="contato@meusalao.com"
                        value={formData.contactEmail}
                        onChange={(e) => setForm((p) => p ? { ...p, contactEmail: e.target.value } : null)}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* ── Cores ── */}
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground text-sm">Cores do Tema</span>
                  </div>

                  {/* Presets */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Paletas prontas</p>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_PRESETS.map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          title={p.label}
                          onClick={() => handlePreset(p.primary, p.secondary)}
                          className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs font-medium transition-all hover:border-primary hover:text-primary"
                          style={{
                            outline: formData.primaryColor === p.primary ? `2px solid ${p.primary}` : undefined,
                            outlineOffset: "2px",
                          }}
                        >
                          <span
                            className="inline-block h-3 w-3 rounded-full ring-1 ring-black/10"
                            style={{ background: p.primary }}
                          />
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom picker */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="primary-color">Cor Primária</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          id="primary-color"
                          value={formData.primaryColor}
                          onChange={(e) => {
                            const v = e.target.value
                            setForm((p) => ({ ...formData, ...p!, primaryColor: v }))
                            refreshTenantTheme(v, formData.secondaryColor)
                          }}
                          className="h-10 w-10 cursor-pointer rounded border border-border"
                        />
                        <Input
                          value={formData.primaryColor}
                          onChange={(e) => {
                            const v = e.target.value
                            setForm((p) => ({ ...formData, ...p!, primaryColor: v }))
                            if (/^#[0-9a-f]{6}$/i.test(v)) refreshTenantTheme(v, formData.secondaryColor)
                          }}
                          className="flex-1 font-mono text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="accent-color">Cor de Destaque</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          id="accent-color"
                          value={formData.secondaryColor}
                          onChange={(e) => {
                            const v = e.target.value
                            setForm((p) => ({ ...formData, ...p!, secondaryColor: v }))
                            refreshTenantTheme(formData.primaryColor, v)
                          }}
                          className="h-10 w-10 cursor-pointer rounded border border-border"
                        />
                        <Input
                          value={formData.secondaryColor}
                          onChange={(e) => {
                            const v = e.target.value
                            setForm((p) => ({ ...formData, ...p!, secondaryColor: v }))
                            if (/^#[0-9a-f]{6}$/i.test(v)) refreshTenantTheme(formData.primaryColor, v)
                          }}
                          className="flex-1 font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <Button type="submit" disabled={saving} className="w-fit">
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Configurações
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>}

          {isSalonOwner && (
            <TabsContent value="horarios">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <CardTitle>Horários de Funcionamento</CardTitle>
                  </div>
                  <CardDescription>
                    Defina os horários em que seu estabelecimento está aberto para receber agendamentos, com suporte a múltiplos intervalos por dia.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                  <div className="p-4 rounded-lg border border-border bg-muted/20 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-foreground">Gerenciar Horários</span>
                      <span className="text-sm text-muted-foreground text-balance">Configure dias da semana, intervalos de abertura e fechamento</span>
                    </div>
                    <Button asChild>
                      <Link href="/settings/business-hours">
                        Abrir Editor
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="aparencia">
            {/* ── Aparência ── */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sun className="h-5 w-5 text-primary" />
                  <CardTitle>Aparência</CardTitle>
                </div>
                <CardDescription>Modo de exibição e arredondamento dos elementos</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                {/* Theme mode */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Modo de cor</p>
                  <div className="flex flex-wrap gap-3">
                    {mounted ? (
                      <>
                        <Button variant={theme === "light" ? "default" : "outline"} size="sm" onClick={() => setTheme("light")}>
                          <Sun className="mr-2 h-4 w-4" />Claro
                        </Button>
                        <Button variant={theme === "dark" ? "default" : "outline"} size="sm" onClick={() => setTheme("dark")}>
                          <Moon className="mr-2 h-4 w-4" />Escuro
                        </Button>
                        <Button variant={theme === "system" ? "default" : "outline"} size="sm" onClick={() => setTheme("system")}>
                          <Monitor className="mr-2 h-4 w-4" />Sistema
                        </Button>
                      </>
                    ) : (
                      <div className="flex gap-3">
                        <div className="h-9 w-22 animate-pulse rounded bg-muted" />
                        <div className="h-9 w-24 animate-pulse rounded bg-muted" />
                        <div className="h-9 w-26 animate-pulse rounded bg-muted" />
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Border radius */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sliders className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">Arredondamento de bordas</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {RADIUS_PRESETS.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => handleRadiusChange(r.value)}
                        className={`px-3 py-1.5 text-xs font-medium border rounded-lg transition-all ${currentRadius === r.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-foreground hover:border-primary"
                          }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  {/* Live preview */}
                  <div className="mt-3 flex items-center gap-3">
                    <div
                      className="h-8 w-20 bg-primary opacity-90 transition-all"
                      style={{ borderRadius: `var(--radius)` }}
                    />
                    <div
                      className="h-8 w-20 border-2 border-primary transition-all"
                      style={{ borderRadius: `var(--radius)` }}
                    />
                    <span className="text-xs text-muted-foreground">Pré-visualização</span>
                  </div>
                </div>

                <Separator />

                {/* Página inicial */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Home className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">Página inicial após login</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Escolha para qual página você será redirecionado ao entrar.</p>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_PAGE_OPTIONS.map((opt) => {
                      const Icon = opt.icon
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleDefaultPageChange(opt.value)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition-all ${
                            defaultPage === opt.value
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border text-foreground hover:border-primary"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <Separator />

                {/* Modo de visualização de agendamentos */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <LayoutGrid className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">Visualização padrão de agendamentos</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Como a lista de agendamentos será exibida por padrão.</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "list", label: "Lista", icon: ClipboardList },
                      { value: "calendar", label: "Grade", icon: Calendar },
                      { value: "agenda", label: "Agenda", icon: Clock },
                    ].map((opt) => {
                      const Icon = opt.icon
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleAppointmentViewModeChange(opt.value)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition-all ${
                            appointmentViewMode === opt.value
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border text-foreground hover:border-primary"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {isOwner && <TabsContent value="modulos">
            {/* ── Módulos ── */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5 text-primary" />
                  <CardTitle>Módulos do Sistema</CardTitle>
                </div>
                <CardDescription>Ative ou desative funcionalidades e personalize nomes</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                {modules?.map((mod) => {
                  let configParsed = { displayName: "" };
                  try {
                    if (mod.configuration) configParsed = JSON.parse(mod.configuration);
                  } catch { }

                  const moduleNames: Record<number, string> = {
                    1: "Clientes",
                    2: "Agendamentos",
                    3: "Serviços",
                    4: "Funcionários",
                    5: "Financeiros",
                    6: "Relatórios",
                    7: "Configurações",
                    8: "Booking",
                    9: "WhatsAppBot"
                  };

                  return (
                    <div key={mod.module} className="flex flex-col gap-4 p-4 rounded-lg border border-border bg-muted/20">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-foreground">
                            {moduleNames[mod.module] || `Módulo ${mod.module}`}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {mod.isEnabled ? "Ativado" : "Desativado"}
                          </span>
                        </div>
                        <Switch
                          checked={mod.isEnabled}
                          onCheckedChange={(checked) => handleModuleUpdate(mod.module, checked, mod.configuration)}
                        />
                      </div>

                      {mod.isEnabled && (
                        <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                          <Label htmlFor={`display-name-${mod.module}`} className="text-xs">Nome de Exibição personalizado</Label>
                          <div className="flex gap-2">
                            <Input
                              id={`display-name-${mod.module}`}
                              placeholder={moduleNames[mod.module]}
                              defaultValue={configParsed.displayName}
                              className="h-8 text-sm"
                              onBlur={(e) => {
                                if (e.target.value === configParsed.displayName) return;
                                const newConfig = JSON.stringify({ ...configParsed, displayName: e.target.value });
                                handleModuleUpdate(mod.module, mod.isEnabled, newConfig);
                              }}
                            />
                            <Button variant="ghost" size="sm" className="h-8 px-2">
                              <Save className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>}

          {isSalonOwner && <TabsContent value="anamnesis">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  <CardTitle>Configurar Anamnese</CardTitle>
                </div>
                <CardDescription>Gerencie as perguntas e seções da ficha de avaliação capilar</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <div className="p-4 rounded-lg border border-border bg-muted/20 flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-foreground">Gerenciar Perguntas</span>
                    <span className="text-sm text-muted-foreground text-balance">Personalize sua ficha de anamnese para atender melhor seus clientes</span>
                  </div>
                  <Button asChild>
                    <Link href="/settings/anamnesis">
                      Abrir Editor
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>}
          {isSalonOwner && <TabsContent value="assinaturas">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <CardTitle>Planos de Assinatura</CardTitle>
                </div>
                <CardDescription>Crie e gerencie planos de assinatura para seus clientes</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <div className="p-4 rounded-lg border border-border bg-muted/20 flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-foreground">Gerenciar Planos</span>
                    <span className="text-sm text-muted-foreground text-balance">Defina planos com preço, duração e número de sessões</span>
                  </div>
                  <Button asChild>
                    <Link href="/settings/membership-plans">
                      Abrir Planos
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>}
          <TabsContent value="seguranca">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle>Segurança</CardTitle>
                </div>
                <CardDescription>Gerencie a autenticação de dois fatores da sua conta</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20">
                  <div className="flex items-center gap-3">
                    {twoFactorEnabled
                      ? <ShieldCheck className="h-5 w-5 text-green-500 shrink-0" />
                      : <ShieldOff className="h-5 w-5 text-muted-foreground shrink-0" />
                    }
                    <div>
                      <p className="font-semibold text-foreground text-sm">Autenticação de dois fatores</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {twoFactorEnabled
                          ? "Ativado — um código será enviado por e-mail a cada login."
                          : "Desativado — ative para aumentar a segurança da sua conta."}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={twoFactorEnabled}
                    onCheckedChange={(checked) => {
                      setTfaError("")
                      setTfaCode("")
                      set2FADialog(checked ? "request" : "disable")
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Dialog: solicitar código */}
            <Dialog open={tfa2Dialog === "request"} onOpenChange={(o) => !o && set2FADialog("idle")}>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    Ativar autenticação de dois fatores
                  </DialogTitle>
                  <DialogDescription>
                    Vamos enviar um código de verificação para <strong>{user?.email}</strong>. Confirme para continuar.
                  </DialogDescription>
                </DialogHeader>
                {tfaError && <p className="text-sm text-destructive">{tfaError}</p>}
                <DialogFooter className="flex-col gap-2 sm:flex-row">
                  <Button variant="outline" onClick={() => set2FADialog("idle")} disabled={tfaLoading}>Cancelar</Button>
                  <Button onClick={handleRequest2FA} disabled={tfaLoading}>
                    {tfaLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enviar código
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Dialog: confirmar código */}
            <Dialog open={tfa2Dialog === "confirm"} onOpenChange={(o) => !o && set2FADialog("idle")}>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    Digite o código de verificação
                  </DialogTitle>
                  <DialogDescription>
                    Insira o código de 6 dígitos enviado para <strong>{user?.email}</strong>. Válido por 10 minutos.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-center py-2">
                  <InputOTP maxLength={6} value={tfaCode} onChange={setTfaCode}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {tfaError && <p className="text-sm text-destructive text-center">{tfaError}</p>}
                <DialogFooter className="flex-col gap-2 sm:flex-row">
                  <Button variant="outline" onClick={() => set2FADialog("idle")} disabled={tfaLoading}>Cancelar</Button>
                  <Button onClick={handleConfirm2FA} disabled={tfaLoading || tfaCode.length !== 6}>
                    {tfaLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Dialog: desativar 2FA */}
            <Dialog open={tfa2Dialog === "disable"} onOpenChange={(o) => !o && set2FADialog("idle")}>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <ShieldOff className="h-5 w-5 text-destructive" />
                    Desativar autenticação de dois fatores
                  </DialogTitle>
                  <DialogDescription>
                    Sua conta ficará protegida apenas por senha. Tem certeza que deseja desativar o 2FA?
                  </DialogDescription>
                </DialogHeader>
                {tfaError && <p className="text-sm text-destructive">{tfaError}</p>}
                <DialogFooter className="flex-col gap-2 sm:flex-row">
                  <Button variant="outline" onClick={() => set2FADialog("idle")} disabled={tfaLoading}>Cancelar</Button>
                  <Button variant="destructive" onClick={handleDisable2FA} disabled={tfaLoading}>
                    {tfaLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Desativar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {isSalonOwner && (
            <TabsContent value="whatsapp">
              <div className="flex flex-col gap-4">

                {/* ── Seção compartilhada: Bot ── */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      <CardTitle>Configurações do Bot</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                      <div className="flex flex-col gap-0.5">
                        <Label htmlFor="whatsapp-booking-toggle" className="font-semibold text-sm cursor-pointer">
                          Agendamento pelo WhatsApp
                        </Label>
                        <p className="text-xs text-muted-foreground">Permite que clientes agendem via bot.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{useWhatsappBooking ? "Ativo" : "Inativo"}</span>
                        <Switch id="whatsapp-booking-toggle" checked={useWhatsappBooking} onCheckedChange={setUseWhatsappBooking} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1.5" asChild>
                        <Link href="/settings/whatsapp"><MessageSquare className="h-3.5 w-3.5" />Templates de mensagem</Link>
                      </Button>
                      <Button onClick={handleSaveWhatsapp} disabled={savingWp} size="sm" className="gap-2">
                        {savingWp && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        <Save className="h-3.5 w-3.5" />Salvar
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* ── Sub-tabs de canal ── */}
                <Card>
                  <CardContent className="p-0">
                    {/* Sub-tab header */}
                    <div className="flex border-b">
                      <button
                        onClick={() => { if (!officialIsActive) setWhatsappSubTab("evolution") }}
                        disabled={officialIsActive}
                        title={officialIsActive ? "API Oficial ativa — desconecte para usar Evolution" : undefined}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                          whatsappSubTab === "evolution"
                            ? "border-primary text-primary"
                            : officialIsActive
                              ? "border-transparent text-muted-foreground opacity-40 cursor-not-allowed"
                              : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        ⚡ Evolution Go
                      </button>
                      <button
                        onClick={() => { if (!evolutionIsActive) setWhatsappSubTab("official") }}
                        disabled={evolutionIsActive}
                        title={evolutionIsActive ? "Evolution ativo — desconecte para usar a API Oficial" : undefined}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                          whatsappSubTab === "official"
                            ? "border-primary text-primary"
                            : evolutionIsActive
                              ? "border-transparent text-muted-foreground opacity-40 cursor-not-allowed"
                              : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        📱 API Oficial Meta
                      </button>
                    </div>

                    {/* Sub-tab content */}
                    <div className="p-4">
                      {whatsappSubTab === "evolution" && <EvolutionSubTab />}
                      {whatsappSubTab === "official" && <OfficialApiSubTab />}
                    </div>
                  </CardContent>
                </Card>

              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Modal: criar ou vincular instância Evolution */}
      <Dialog open={linkModalOpen} onOpenChange={open => !open && setLinkModalOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar instância Evolution</DialogTitle>
            <DialogDescription>Crie uma nova instância ou vincule uma existente de outro estabelecimento seu.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            {loadingAvailable ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${linkChoice === "new" ? "border-primary bg-primary/5" : "border-border"}`}>
                  <input type="radio" name="link-choice" value="new" checked={linkChoice === "new"} onChange={() => setLinkChoice("new")} className="mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Criar nova instância</p>
                    <p className="text-xs text-muted-foreground">Uma instância exclusiva para este estabelecimento.</p>
                  </div>
                </label>
                {availableInstances.map(inst => (
                  <label key={inst.instanceId} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${linkChoice === "link" && selectedLinkInstanceId === inst.instanceId ? "border-primary bg-primary/5" : "border-border"}`}>
                    <input type="radio" name="link-choice" value={inst.instanceId} checked={linkChoice === "link" && selectedLinkInstanceId === inst.instanceId} onChange={() => { setLinkChoice("link"); setSelectedLinkInstanceId(inst.instanceId) }} className="mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Vincular: {inst.tenantName}</p>
                      <p className="text-xs text-muted-foreground">{inst.phoneNumber ?? "Sem número"} · {inst.status === 2 ? "Conectado" : inst.status === 1 ? "Conectando" : "Desconectado"}</p>
                    </div>
                  </label>
                ))}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkModalOpen(false)} disabled={linking}>Cancelar</Button>
            <Button onClick={handleConfirmLinkModal} disabled={linking || (linkChoice === "link" && !selectedLinkInstanceId)}>
              {linking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {linkChoice === "new" ? "Criar instância" : "Vincular"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: confirmar exclusão de instância Evolution */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir instância?</DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita. A instância Evolution será removida permanentemente.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteEvolution}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Disconnect Confirmation Dialog */}
      <Dialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Desconectar WhatsApp?</DialogTitle>
            <DialogDescription>
              Os envios automáticos de mensagens serão interrompidos até que você reconecte um número.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDisconnectDialogOpen(false)} disabled={disconnecting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDisconnectWa} disabled={disconnecting}>
              {disconnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Desconectar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthGuard>
  )
}
