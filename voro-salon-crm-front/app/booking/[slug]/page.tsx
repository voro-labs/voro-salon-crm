"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { User, CheckCircle2, Loader2, Send, MessageCircle, Calendar, Smartphone, X, Bell, Clock, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { API_CONFIG, apiCall, getAuthToken } from "@/lib/api"
import { getServicePlaceholders } from "@/lib/branding"
import { format } from "date-fns"
import { PhoneInput } from "@/components/ui/custom/phone-input"
import { CountrySelector } from "@/components/ui/custom/country-selector"
import { flags } from "@/lib/flag-utils"
import { cn } from "@/lib/utils"
import { AuthenticatedImage } from "@/components/ui/custom/authenticated-image"

type Step = 'SERVICE' | 'PROFESSIONAL' | 'DATETIME' | 'NAME' | 'PHONE' | 'CONFIRM' | 'SUCCESS'

interface SelectedService {
  id: string
  name: string
  price: number
  durationMinutes: number
  promotionalPrice?: number
  hasPromotion?: boolean
}

// ─── Types for public tenant data ────────────────────────────────────────────

interface BusinessHourRange {
  openTime: string
  closeTime: string
}

interface BusinessHour {
  dayOfWeek: number   // 0 = Sunday … 6 = Saturday
  isOpen: boolean
  ranges: BusinessHourRange[]
}

function isDateClosed(dateStr: string, businessHours?: BusinessHour[]): boolean {
  if (!businessHours || businessHours.length === 0) return false
  const dow = new Date(`${dateStr}T00:00:00`).getDay()
  const dayHours = businessHours.find(h => h.dayOfWeek === dow)
  if (!dayHours) return true          // dia não configurado = fechado
  return !dayHours.isOpen
}

interface PublicTenant {
  id: string
  name: string
  slug: string
  logoUrl?: string | null
  coverImageUrl?: string | null
  primaryColor?: string | null
  secondaryColor?: string | null
  contactPhone?: string | null
  contactEmail?: string | null
  isBookingEnabled?: boolean
  establishmentType?: number
  businessHours?: BusinessHour[]
  // address fields — any combination may be present
  street?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
  address?: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_NAMES_PT: Record<number, string> = {
  0: "Domingo",
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildGoogleMapsUrl(tenant: PublicTenant): string | null {
  // Prefer a pre-composed address field, then assemble from parts
  const parts: string[] = []

  if (tenant.address) {
    parts.push(tenant.address)
  } else {
    if (tenant.street) parts.push(tenant.street)
    if (tenant.neighborhood) parts.push(tenant.neighborhood)
  }

  if (tenant.city) parts.push(tenant.city)
  if (tenant.state) parts.push(tenant.state)
  if (tenant.zipCode) parts.push(tenant.zipCode)

  if (parts.length === 0) return null

  const query = encodeURIComponent(`${tenant.name} ${parts.join(", ")}`)
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}

function formatTime(t: string): string {
  // Slice to "HH:mm" whether the string is "HH:mm" or "HH:mm:ss"
  return t ? t.slice(0, 5) : ""
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  if (remaining === 0) return `${hours}h`
  return `${hours}h ${remaining}min`
}

// ─── WelcomeCard component ────────────────────────────────────────────────────

function WelcomeCard({ tenant }: { tenant: PublicTenant }) {
  const mapsUrl = buildGoogleMapsUrl(tenant)

  const sortedHours = tenant.businessHours
    ? [...tenant.businessHours].sort((a, b) => {
        // Reorder so Monday (1) comes first, Sunday (0) last
        const order = [1, 2, 3, 4, 5, 6, 0]
        return order.indexOf(a.dayOfWeek) - order.indexOf(b.dayOfWeek)
      })
    : []

  const hasBusinessHours = sortedHours.length > 0

  return (
    <div className="rounded-2xl rounded-tl-none border bg-background shadow-sm overflow-hidden max-w-[85%]">
      {/* Cover image */}
      {tenant.coverImageUrl && (
        <div className="w-full h-28 overflow-hidden">
          <img
            src={tenant.coverImageUrl}
            alt={`Capa de ${tenant.name}`}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-4 flex flex-col gap-4">
        {/* Logo + name row */}
        <div className="flex items-center gap-3">
          {tenant.logoUrl ? (
            <img
              src={tenant.logoUrl}
              alt={tenant.name}
              className="h-14 w-14 rounded-full object-cover border-2 border-border shadow-sm shrink-0"
            />
          ) : (
            <div className="h-14 w-14 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
              {getInitials(tenant.name)}
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-base text-foreground leading-tight truncate">
              {tenant.name}
            </span>
            <Badge
              variant="outline"
              className="w-fit text-[10px] h-4 py-0 text-green-600 bg-green-50 mt-1"
            >
              Agendamento Online
            </Badge>
          </div>
        </div>

        {/* Business hours */}
        {hasBusinessHours && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <Clock className="h-3 w-3" />
              Horários
            </div>
            <div className="grid grid-cols-1 gap-0.5">
              {sortedHours.map((bh) => (
                <div key={bh.dayOfWeek} className="flex items-start justify-between text-xs gap-2">
                  <span className="text-muted-foreground w-16 shrink-0">
                    {DAY_NAMES_PT[bh.dayOfWeek] ?? `Dia ${bh.dayOfWeek}`}
                  </span>
                  {!bh.isOpen || !bh.ranges || bh.ranges.length === 0 ? (
                    <span className="text-destructive/70 font-medium">Fechado</span>
                  ) : (
                    <span className="text-foreground font-medium text-right">
                      {bh.ranges
                        .map((r) => `${formatTime(r.openTime)} – ${formatTime(r.closeTime)}`)
                        .join(" | ")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Maps button */}
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
            Ver no Google Maps
          </a>
        )}
      </div>
    </div>
  )
}

interface ChatMessage {
  id: string
  text: string
  sender: 'bot' | 'user'
}

export default function PublicBookingPage() {
  const { slug } = useParams()
  const router = useRouter()
  const [step, setStep] = useState<Step>('SERVICE')
  const [tenant, setTenant] = useState<PublicTenant | null>(null)
  const [services, setServices] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])

  // Session ID único para rastrear o funil desta visita
  const [sessionId] = useState(() =>
    (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  )

  // Fire-and-forget: salva etapa do funil sem bloquear o fluxo
  const trackFunnelStep = (funnelState: string, extra?: Record<string, unknown>) => {
    apiCall(API_CONFIG.ENDPOINTS.PUBLIC_BOOKING_TRACK, {
      method: "POST",
      body: JSON.stringify({ tenantSlug: slug, sessionId, funnelState, ...extra }),
    }).catch(() => {})
  }

  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([])

  const [form, setForm] = useState({
    name: '',
    phone: '',
    serviceId: '',
    employeeId: '' as string,
    date: '',
    time: '',
    description: '',
    reminderMinutes: null as number | null,
  })

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [availability, setAvailability] = useState<any[]>([])
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [isClosedDay, setIsClosedDay] = useState(false)
  const [appointmentId, setAppointmentId] = useState<string | null>(null)
  const [countryCode, setCountryCode] = useState("BR")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (getAuthToken()) router.replace("/dashboard")
  }, [router])

  // App banner
  const [showAppBanner, setShowAppBanner] = useState(false)
  const [showStoreLinks, setShowStoreLinks] = useState(false)
  const isAndroid = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent)
  const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent)

  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    const dismissed = sessionStorage.getItem("voro_app_banner_dismissed")
    if (isMobile && !dismissed) setShowAppBanner(true)
  }, [])

  function handleDismissBanner() {
    setShowAppBanner(false)
    sessionStorage.setItem("voro_app_banner_dismissed", "1")
  }

  function handleOpenApp() {
    window.location.href = `vorosaloncrm://booking/${slug}`
    setTimeout(() => setShowStoreLinks(true), 1500)
  }

  useEffect(() => {
    async function init() {
      try {
        const res = await apiCall<any>(`${API_CONFIG.ENDPOINTS.PUBLIC_TENANT}/${slug}`)
        if (res.hasError) {
          toast.error("Estabelecimento não encontrado.")
          return
        }
        setTenant(res.data)

        // Load data from localStorage
        const savedName = localStorage.getItem('voro_booking_name')
        const savedPhone = localStorage.getItem('voro_booking_phone')
        const savedCountry = localStorage.getItem('voro_booking_country')

        if (savedName || savedPhone) {
          setForm(p => ({
            ...p,
            name: savedName || p.name,
            phone: savedPhone || p.phone
          }))
          if (savedCountry) setCountryCode(savedCountry)
        }

        // Fetch services immediately to check availability
        const svcRes = await apiCall<any[]>(`${API_CONFIG.ENDPOINTS.PUBLIC_SERVICES}?tenantSlug=${slug}`)
        const servicesData = svcRes.data || []
        setServices(servicesData)

        if (servicesData.length === 0) {
          setLoading(false)
          return
        }

        // Initial bot message
        addBotMessage(`Olá! Bem-vindo ao ${res.data.name}. Qual serviço você gostaria de agendar hoje?`)
        setStep('SERVICE')
        trackFunnelStep('AWAITING_SERVICE')
      } catch (err) {
        toast.error("Erro ao carregar dados do estabelecimento.")
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [slug])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const addBotMessage = (text: string) => {
    setMessages(prev => [...prev, { id: Math.random().toString(), text, sender: 'bot' }])
  }

  const addUserMessage = (text: string) => {
    setMessages(prev => [...prev, { id: Math.random().toString(), text, sender: 'user' }])
  }

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) return

    // Save to localStorage
    localStorage.setItem('voro_booking_name', form.name)

    addUserMessage(`Meu nome é ${form.name}`)
    addBotMessage(`Prazer em te conhecer, ${form.name}! Agora, qual seu WhatsApp para que possamos entrar em contato?`)
    setStep('PHONE')
    trackFunnelStep('AWAITING_CONFIRMATION', { clientName: form.name })
  }

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.phone) return

    const dialCode = flags[countryCode]?.dialCode || ""
    const fullPhone = `${dialCode}${form.phone}`

    const dialCodeNum = flags[countryCode]?.dialCodeOnlyNumber || ""
    const phoneForApi = `${dialCodeNum}${form.phone}`

    // Save to localStorage
    localStorage.setItem('voro_booking_phone', form.phone)
    localStorage.setItem('voro_booking_country', countryCode)

    addUserMessage(`Meu WhatsApp é ${fullPhone}`)
    setLoading(true)

    try {
      // Check if client exists (optional but good for UX)
      const checkRes = await apiCall<any>(`${API_CONFIG.ENDPOINTS.PUBLIC_CHECK_CLIENT}?tenantSlug=${slug}&phone=${phoneForApi}`)
      if (!checkRes.hasError && checkRes.data) {
        addBotMessage(`Vimos que você já é nosso cliente!`)
      }

      addBotMessage("Quase lá! Tem alguma observação ou pedido especial que gostaria de deixar?")
      setStep('CONFIRM')
    } catch {
      toast.error("Erro ao processar seu telefone.")
    } finally {
      setLoading(false)
    }
  }

  const toggleServiceSelection = (service: any) => {
    setSelectedServices(prev => {
      const isSelected = prev.some(s => s.id === service.id)
      if (isSelected) {
        return prev.filter(s => s.id !== service.id)
      } else {
        return [...prev, {
          id: service.id,
          name: service.name,
          price: service.price,
          durationMinutes: service.durationMinutes,
          promotionalPrice: service.promotionalPrice,
          hasPromotion: service.hasPromotion,
        }]
      }
    })
  }

  const handleServicesConfirm = async () => {
    if (selectedServices.length === 0) return

    // Keep serviceId for legacy compat (first selected service)
    setForm(p => ({ ...p, serviceId: selectedServices[0].id }))

    const serviceNames = selectedServices.map(s => s.name).join(", ")
    addUserMessage(serviceNames)
    setLoading(true)

    try {
      // Use first service to look up employees (they qualify for any of the selected services)
      const firstServiceId = selectedServices[0].id
      const empRes = await apiCall<any[]>(`${API_CONFIG.ENDPOINTS.PUBLIC_EMPLOYEES}?tenantSlug=${slug}&serviceId=${firstServiceId}`)
      setEmployees(empRes.data || [])

      if (empRes.data && empRes.data.length > 0) {
        addBotMessage("Você tem preferência por algum profissional?")
        setStep('PROFESSIONAL')
        trackFunnelStep('AWAITING_EMPLOYEE', { serviceIds: selectedServices.map(s => s.id) })
      } else {
        addBotMessage("Perfeito. Agora, qual dia e hora você prefere?")
        setStep('DATETIME')
        trackFunnelStep('AWAITING_DATE', { serviceIds: selectedServices.map(s => s.id) })
      }
    } catch {
      toast.error("Erro ao buscar profissionais.")
    } finally {
      setLoading(false)
    }
  }

  const handleEmployeeSelect = (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId)
    setForm(p => ({ ...p, employeeId }))
    addUserMessage(emp ? emp.name : "Qualquer um")
    addBotMessage("Ótimo. Agora, escolha o dia e horário que melhor funciona para você.")
    setStep('DATETIME')
    trackFunnelStep('AWAITING_DATE', { employeeId })
  }

  // Fetch availability when date or professional changes
  useEffect(() => {
    if (step === 'DATETIME' && form.date) {
      // Verifica se o dia está fechado antes de chamar a API
      const closed = isDateClosed(form.date, tenant?.businessHours)
      setIsClosedDay(closed)
      if (closed) {
        setAvailability([])
        return
      }

      async function fetchAvailability() {
        setLoadingAvailability(true)
        try {
          const params = new URLSearchParams({ tenantSlug: String(slug), date: form.date })
          if (form.employeeId && form.employeeId !== 'none') params.set('employeeId', form.employeeId)
          // Pass all selected serviceIds so the API sums their durations for slot sizing
          if (selectedServices.length > 0) {
            selectedServices.forEach(s => params.append('serviceIds', s.id))
          } else if (form.serviceId) {
            params.set('serviceId', form.serviceId)
          }
          const res = await apiCall<any[]>(`${API_CONFIG.ENDPOINTS.PUBLIC_AVAILABILITY}?${params.toString()}`)
          setAvailability(res.data || [])
        } catch {
          toast.error("Erro ao carregar horários disponíveis.")
        } finally {
          setLoadingAvailability(false)
        }
      }
      fetchAvailability()
    }
  }, [step, form.date, form.employeeId, slug])

  const handleDateTimeSelect = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.date || !form.time) return

    const displayDate = new Date(`${form.date}T00:00:00`)
    addUserMessage(`${format(displayDate, "dd/MM/yyyy")} às ${form.time}`)
    addBotMessage("Perfeito! Para finalizar, qual o seu nome?")
    setStep('NAME')
    trackFunnelStep('AWAITING_DESCRIPTION', { date: form.date, time: form.time })
  }

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const scheduledDateTime = new Date(`${form.date}T${form.time}`).toISOString()
      const dialCode = flags[countryCode]?.dialCodeOnlyNumber || ""
      const phoneForApi = `${dialCode}${form.phone}`

      // Quando múltiplos serviços: não vincula serviço, coloca os nomes na description
      const isMultiService = selectedServices.length > 1
      const serviceNamesDescription = isMultiService
        ? selectedServices.map(s => s.name).join(", ")
        : ""

      const finalDescription = isMultiService
        ? [serviceNamesDescription, form.description].filter(Boolean).join(" | ")
        : form.description

      const res = await apiCall<any>(API_CONFIG.ENDPOINTS.PUBLIC_BOOKING, {
        method: "POST",
        body: JSON.stringify({
          tenantSlug: slug,
          clientName: form.name,
          clientPhone: phoneForApi,
          serviceId: isMultiService ? null : (selectedServices.length === 1 ? selectedServices[0].id : (form.serviceId || null)),
          serviceIds: isMultiService ? null : (selectedServices.length === 1 ? [selectedServices[0].id] : (form.serviceId ? [form.serviceId] : [])),
          employeeId: !form.employeeId || form.employeeId === 'none' ? null : form.employeeId,
          scheduledDateTime,
          description: finalDescription,
          reminderMinutes: form.reminderMinutes,
        })
      })

      if (res.hasError) {
        toast.error(res.message || "Erro ao realizar agendamento.")
        return
      }

      if (res.data?.appointmentId) {
        setAppointmentId(res.data.appointmentId)
      }
      setStep('SUCCESS')
      trackFunnelStep('COMPLETED', { appointmentId: res.data?.appointmentId })
      addBotMessage("Tudo certo! Seu agendamento foi solicitado e o estabelecimento foi notificado. Você receberá uma confirmação em breve.")
    } catch {
      toast.error("Erro de conexão.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!tenant && loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background text-center">
        <h1 className="text-xl font-bold">Ops! Estabelecimento não encontrado.</h1>
        <p className="text-muted-foreground mt-2">Verifique o link e tente novamente.</p>
      </div>
    )
  }

  const isBookingDisabled = tenant.isBookingEnabled === false
  const hasNoServices = services.length === 0

  if (isBookingDisabled || hasNoServices) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background text-center">
        {/* Tenant header */}
        <div className="flex flex-col items-center gap-3 mb-8">
          {tenant.logoUrl ? (
            <img
              src={tenant.logoUrl}
              alt={tenant.name}
              className="h-16 w-16 rounded-full object-cover border shadow-sm"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl border">
              {tenant.name[0]}
            </div>
          )}
          <h2 className="text-lg font-bold text-foreground">{tenant.name}</h2>
        </div>

        <div className="max-w-sm w-full flex flex-col items-center gap-4">
          <div className={`h-20 w-20 rounded-full flex items-center justify-center mb-2 ${
            hasNoServices ? "bg-orange-100 text-orange-500" : "bg-muted text-muted-foreground"
          }`}>
            <Calendar className="h-10 w-10" />
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-bold text-foreground">
              {hasNoServices
                ? "Serviços indisponíveis"
                : "Agendamento online indisponível"}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {hasNoServices
                ? "Este estabelecimento ainda não possui serviços cadastrados para agendamento online."
                : "Este estabelecimento não oferece agendamento online. Entre em contato diretamente para marcar um horário."}
            </p>
          </div>

          {tenant.contactPhone && (
            <Button asChild className="mt-2 w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold border-none">
              <a
                href={`https://wa.me/${tenant.contactPhone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Falar pelo WhatsApp
              </a>
            </Button>
          )}
        </div>
      </div>
    )
  }

  const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.vorolabs.vorosaloncrm"
  const APP_STORE_URL = "https://apps.apple.com/app/voro-salon-crm/id6738218040"

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      {/* Mobile App Banner */}
      {showAppBanner && (
        <div className="bg-background border-b border-border/60 shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3 max-w-2xl mx-auto pr-14">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground leading-tight">Voro Salon CRM</p>
              <p className="text-xs text-muted-foreground">Agende mais rápido pelo app</p>
            </div>
            {!showStoreLinks ? (
              <button
                onClick={handleOpenApp}
                className="shrink-0 bg-primary text-primary-foreground text-xs font-bold px-4 py-2 rounded-lg"
              >
                Abrir no app
              </button>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                {isAndroid && (
                  <a
                    href={PLAY_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-primary underline underline-offset-2"
                  >
                    Play Store
                  </a>
                )}
                {isIOS && (
                  <a
                    href={APP_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-primary underline underline-offset-2"
                  >
                    App Store
                  </a>
                )}
                {!isAndroid && !isIOS && (
                  <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-primary underline underline-offset-2">
                    Download
                  </a>
                )}
              </div>
            )}
            <button
              onClick={handleDismissBanner}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors ml-1"
              aria-label="Fechar banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-4 bg-background px-6 py-4 shadow-sm border-b pr-14">
        {tenant.logoUrl ? (
          <AuthenticatedImage
            src={tenant.logoUrl}
            alt={tenant.name}
            className="h-10 w-10 rounded-full object-cover border"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {tenant.name[0]}
          </div>
        )}
        <div className="flex flex-col">
          <h1 className="text-lg font-bold leading-tight">{tenant.name}</h1>
          <Badge variant="outline" className="w-fit text-[10px] h-4 py-0 text-green-600 bg-green-50 animate-pulse">
            Respostas em minutos
          </Badge>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-4" ref={scrollRef}>
        <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full">
          {/* Welcome card — rendered once as the first chat bubble */}
          {tenant && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="flex justify-start"
            >
              <WelcomeCard tenant={tenant} />
            </motion.div>
          )}

          <AnimatePresence>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm ${m.sender === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                    : 'bg-background text-foreground rounded-tl-none border'
                    }`}
                >
                  {m.text}
                </div>
              </motion.div>
            ))}
            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="bg-background border rounded-2xl rounded-tl-none px-4 py-3 flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0.2s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0.4s]" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Input Area */}
      <footer className="sticky bottom-0 bg-background p-4 border-t shadow-lg">
        <div className="max-w-2xl mx-auto w-full">
          {step === 'NAME' && !loading && (
            <form onSubmit={handleNameSubmit} className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold ml-1">Seu Nome</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Ex: João Silva"
                    className="pl-9 h-11"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    required
                    autoFocus
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">
                Próximo
                <Send className="ml-2 h-4 w-4" />
              </Button>
            </form>
          )}

          {step === 'PHONE' && !loading && (
            <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold ml-1">Seu WhatsApp</Label>
                <div className="flex gap-2">
                  <div className="shrink-0">
                    <CountrySelector
                      value={countryCode}
                      onChange={setCountryCode}
                    />
                  </div>
                  <div className="flex-1 relative">
                    <PhoneInput
                      id="phone"
                      value={form.phone}
                      autoComplete="tel"
                      onChange={v => setForm(p => ({ ...p, phone: v }))}
                      countryCode={countryCode}
                      className="h-full"
                      required
                    />
                  </div>
                </div>
              </div>
              <Button type="submit" className="w-full">
                Próximo
                <Send className="ml-2 h-4 w-4" />
              </Button>
            </form>
          )}

          {step === 'SERVICE' && !loading && (() => {
            const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0)
            const totalPrice = selectedServices.reduce((sum, s) => sum + (s.hasPromotion && s.promotionalPrice != null ? s.promotionalPrice : s.price), 0)

            return (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                  {services.map(s => {
                    const isSelected = selectedServices.some(sel => sel.id === s.id)
                    return (
                      <Button
                        key={s.id}
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "h-auto py-3 px-3 flex flex-col items-start gap-1 text-left transition-all",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background hover:bg-primary/5 hover:border-primary hover:text-primary"
                        )}
                        onClick={() => toggleServiceSelection(s)}
                      >
                        <div className="flex items-center gap-1.5 w-full">
                          <span className="font-bold text-sm line-clamp-1 flex-1 text-left">{s.name}</span>
                          {s.hasPromotion && (
                            <span className={cn(
                              "text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
                              isSelected ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"
                            )}>PROMOÇÃO</span>
                          )}
                        </div>
                        {s.hasPromotion && s.promotionalPrice ? (
                          <span className="text-[10px]">
                            <span className={cn("line-through", isSelected ? "text-primary-foreground/60" : "text-muted-foreground")}>{s.durationMinutes} min • R$ {s.price.toFixed(2)}</span>
                            {" "}<span className={isSelected ? "text-white font-bold" : "text-emerald-600 font-bold"}>R$ {s.promotionalPrice.toFixed(2)}</span>
                          </span>
                        ) : (
                          <span className={cn("text-[10px]", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                            {s.durationMinutes} min • R$ {s.price.toFixed(2)}
                          </span>
                        )}
                      </Button>
                    )
                  })}
                </div>

                {selectedServices.length > 0 && (
                  <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium">
                      {selectedServices.length} serviço{selectedServices.length > 1 ? 's' : ''} • {formatDuration(totalDuration)}
                    </span>
                    <span className="font-bold text-foreground">R$ {totalPrice.toFixed(2)}</span>
                  </div>
                )}

                <Button
                  className="w-full"
                  disabled={selectedServices.length === 0}
                  onClick={handleServicesConfirm}
                >
                  Confirmar {selectedServices.length > 0 ? `(${selectedServices.length})` : ""}
                  <Send className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )
          })()}

          {step === 'PROFESSIONAL' && !loading && (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                {employees.map(e => (
                  <Button
                    key={e.id}
                    variant="outline"
                    className="h-auto py-2 px-2 flex items-center gap-3 bg-background hover:bg-primary/5 hover:border-primary hover:text-primary transition-all text-left"
                    onClick={() => handleEmployeeSelect(e.id)}
                  >
                    <div className="h-8 w-8 rounded-full overflow-hidden shrink-0 border">
                      {e.photoUrl ? <img src={e.photoUrl} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-muted flex items-center justify-center text-[10px]">{e.name[0]}</div>}
                    </div>
                    <span className="text-xs font-medium truncate">{e.name}</span>
                  </Button>
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleEmployeeSelect('none')} className="text-xs">
                Qualquer profissional disponível
              </Button>
            </div>
          )}

          {step === 'DATETIME' && !loading && (() => {
            const todayStr = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD no fuso local
            const isToday = form.date === todayStr
            const now = new Date()
            const visibleSlots = availability.filter(slot => {
              if (!isToday) return true
              return new Date(slot.startTime) > now
            })
            return (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] text-muted-foreground ml-1">Data</Label>
                  <Input
                    type="date"
                    value={form.date}
                    min={todayStr}
                    onChange={e => {
                      setForm(p => ({ ...p, date: e.target.value, time: '' }))
                    }}
                    required
                  />
                </div>

                {form.date && (
                  <div className="flex flex-col gap-2">
                    <Label className="text-[10px] text-muted-foreground ml-1">Horários Disponíveis</Label>
                    {loadingAvailability ? (
                      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground justify-center">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Buscando horários...
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {visibleSlots.map(slot => (
                          <Button
                            key={slot.startTime}
                            variant={form.time === format(new Date(slot.startTime), "HH:mm") ? "default" : "outline"}
                            size="sm"
                            className={cn(
                              "h-10 text-[10px] px-1",
                              !slot.isAvailable && "opacity-30 cursor-not-allowed"
                            )}
                            disabled={!slot.isAvailable}
                            onClick={() => setForm(p => ({ ...p, time: format(new Date(slot.startTime), "HH:mm") }))}
                          >
                            {format(new Date(slot.startTime), "HH:mm")}
                          </Button>
                        ))}
                      </div>
                    )}
                    {visibleSlots.length === 0 && !loadingAvailability && (
                      <p className="text-[10px] text-muted-foreground text-center">
                        {isClosedDay
                          ? "Estabelecimento fechado neste dia."
                          : "Nenhum horário disponível para esta data."}
                      </p>
                    )}
                  </div>
                )}

                <Button
                  onClick={handleDateTimeSelect}
                  className="w-full h-10 mt-1"
                  disabled={!form.date || !form.time}
                >
                  Confirmar Horário
                </Button>
              </div>
            )
          })()}

          {step === 'CONFIRM' && !loading && (
            <form onSubmit={handleFinalSubmit} className="flex flex-col gap-3">
              {/* Resumo do agendamento */}
              {form.date && form.time && (
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 flex flex-col gap-1.5">
                  {selectedServices.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {selectedServices.map((svc, idx) => (
                        <div key={svc.id} className="flex items-center justify-between gap-2 text-sm">
                          <span className={cn("font-semibold text-foreground", idx > 0 && "text-muted-foreground font-normal")}>{svc.name}</span>
                          {svc.hasPromotion && svc.promotionalPrice != null ? (
                            <span className="text-xs shrink-0">
                              <span className="line-through text-muted-foreground">R$ {svc.price.toFixed(2)}</span>
                              {" "}<span className="text-emerald-600 font-bold">R$ {svc.promotionalPrice.toFixed(2)}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground shrink-0">R$ {svc.price.toFixed(2)}</span>
                          )}
                        </div>
                      ))}
                      {selectedServices.length > 1 && (
                        <div className="flex items-center justify-between text-xs font-bold border-t border-border/50 pt-1 mt-0.5">
                          <span className="text-foreground">Total</span>
                          <span className="text-foreground">
                            R$ {selectedServices.reduce((sum, s) => sum + (s.hasPromotion && s.promotionalPrice != null ? s.promotionalPrice : s.price), 0).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : form.serviceId && services.find((s: any) => s.id === form.serviceId) ? (() => {
                    const svc = services.find((s: any) => s.id === form.serviceId)!
                    return (
                      <div className="flex items-center gap-2 text-sm flex-wrap">
                        <span className="font-semibold text-foreground">{svc.name}</span>
                        {svc.hasPromotion && svc.promotionalPrice ? (
                          <span className="text-xs">
                            <span className="line-through text-muted-foreground">R$ {svc.price.toFixed(2)}</span>
                            {" "}<span className="text-emerald-600 font-bold">R$ {svc.promotionalPrice.toFixed(2)}</span>
                          </span>
                        ) : null}
                      </div>
                    )
                  })() : null}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{format(new Date(`${form.date}T00:00:00`), "dd/MM/yyyy")} às {form.time}</span>
                  </div>
                  {form.employeeId && form.employeeId !== 'none' && employees.find(e => e.id === form.employeeId) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      <span>{employees.find(e => e.id === form.employeeId)?.name}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground ml-1">Observações (opcional)</Label>
                <Textarea
                  placeholder={getServicePlaceholders(tenant?.establishmentType ?? 0).observations}
                  rows={2}
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="resize-none text-sm"
                />
              </div>

              {/* Lembrete */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] text-muted-foreground ml-1 flex items-center gap-1">
                  <Bell className="h-3 w-3" />
                  Lembrete antes do horário (opcional)
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {[null, 15, 30, 60, 120, 180, 360, 720, 1440].map((min) => (
                    <button
                      key={min ?? 'none'}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, reminderMinutes: min }))}
                      className={cn(
                        "h-9 rounded-lg border text-xs font-semibold transition-colors",
                        form.reminderMinutes === min
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      {min === null ? "Sem" : min < 60 ? `${min}min` : min === 60 ? "1h" : min < 1440 ? `${min / 60}h` : "1 dia"}
                    </button>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full font-bold" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Finalizar Agendamento
              </Button>
            </form>
          )}

          {step === 'SUCCESS' && (
            <div className="flex flex-col gap-4 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-bold">Agendamento Solicitado!</h2>
                <p className="text-sm text-muted-foreground">
                  Sua solicitação foi enviada para o estabelecimento.
                </p>
              </div>
              <Button asChild className="bg-[#25D366] hover:bg-[#128C7E] border-none font-bold">
                <a
                  href={`https://wa.me/${tenant.contactPhone?.replace(/\D/g, '')}?text=Olá, acabei de solicitar um agendamento no ${tenant.name} para o dia ${format(new Date(`${form.date}T00:00:00`), "dd/MM")} às ${form.time}.${appointmentId ? ` Veja o comprovante: ${window.location.origin}/receipt/${appointmentId}` : ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Enviar por WhatsApp
                </a>
              </Button>

              {appointmentId && (
                <Button variant="outline" onClick={() => router.push(`/receipt/${appointmentId}`)} className="font-semibold">
                  <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
                  Ver Comprovante Detalhado
                </Button>
              )}
            </div>
          )}
        </div>
      </footer>
    </div>
  )
}
