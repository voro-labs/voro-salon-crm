"use client"

import React, { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { LegalFooter } from "@/components/legal/legal-footer"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useScroll,
  useTransform,
  useSpring,
} from "framer-motion"
import {
  CheckCircle2, Scissors, BarChart3, Users, Calendar, ClipboardList,
  Wallet, Zap, ArrowRight, Loader2, ChevronLeft, ChevronRight,
  Bell, Search, TrendingUp, Clock, Star, Info, MessageCircle,
  Sparkles, QrCode, Copy, Check, AlertCircle, CreditCard,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { API_CONFIG, apiCall, secureApiCall, getAuthToken } from "@/lib/api"
import { getClientBranding, getEstablishmentTypeByHostname } from "@/lib/branding"
import { EstablishmentType } from "@/types/Enums/establishmentType.enum"
import type { SubscriptionPlanDto, CheckoutResultDto, CouponValidationResultDto, ResolvedPlanPriceDto } from "@/types/subscription.interface"
import { ModuleInfoDialog } from "@/components/ui/custom/module-info-dialog"
import { ThemeToggle } from "@/components/ui/custom/theme-toggle"
import { ColorSchemePicker } from "@/components/ui/custom/color-scheme-picker"
import { fadeUp, scaleIn, stagger, staggerFast, useViewportVariants } from "@/components/features/landing/landing.variants"
import { CountUp } from "@/components/features/landing/count-up"
import { Section } from "@/components/features/landing/section"
import { TESTIMONIALS, FEATURES, buildFaq } from "@/components/features/landing/landing-data"
import { DashboardMockup } from "@/components/features/landing/mockups/dashboard-mockup"
import { AgendamentosMockup } from "@/components/features/landing/mockups/appointments-mockup"
import { ClientesMockup } from "@/components/features/landing/mockups/clients-mockup"
import { FinanceiroMockup } from "@/components/features/landing/mockups/finance-mockup"
import { ServicosMockup } from "@/components/features/landing/mockups/services-mockup"
import { RelatoriosMockup } from "@/components/features/landing/mockups/reports-mockup"
import { WhatsAppMockup } from "@/components/features/landing/mockups/whatsapp-mockup"
import { AgendamentoOnlineMockup } from "@/components/features/landing/mockups/online-booking-mockup"
import { promoEndTarget, isPlanPromoActive, formatPromoEndsAt, HeroPromoTimer, PromoCountdown } from "@/components/features/landing/promo-countdown"
import { PlanCard } from "@/components/features/landing/plan-card"


// ── Product screenshots (mockups) ─────────────────────────────────────────────

const SCREENSHOTS = [
  {
    label: "Dashboard",
    description: "Visão geral do seu salão em tempo real",
    icon: BarChart3,
    content: <DashboardMockup />,
  },
  {
    label: "Agendamentos",
    description: "Gerencie todos os horários com facilidade",
    icon: Calendar,
    content: <AgendamentosMockup />,
  },
  {
    label: "Clientes",
    description: "Histórico completo de cada cliente",
    icon: Users,
    content: <ClientesMockup />,
  },
  {
    label: "Financeiro",
    description: "Receitas, despesas e fluxo de caixa",
    icon: Wallet,
    content: <FinanceiroMockup />,
  },
  {
    label: "Serviços",
    description: "Catálogo de serviços com preços e duração",
    icon: Scissors,
    content: <ServicosMockup />,
  },
  {
    label: "Relatórios",
    description: "Métricas e análises para crescer mais",
    icon: TrendingUp,
    content: <RelatoriosMockup />,
  },
  {
    label: "WhatsApp",
    description: "Confirmações automáticas que reduzem no-show",
    icon: MessageCircle,
    content: <WhatsAppMockup />,
  },
  {
    label: "Link Online",
    description: "Clientes agendam sozinhos, sem ligar",
    icon: Zap,
    content: <AgendamentoOnlineMockup />,
  },
]


// ── Page ──────────────────────────────────────────────────────────────────────

export default function PrecosPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const shouldReduce = useReducedMotion()
  const branding = getClientBranding()
  const FAQ = buildFaq(branding.productName, branding.establishmentLabel)

  const [plans, setPlans] = useState<SubscriptionPlanDto[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanDto | null>(null)
  const [form, setForm] = useState({
    name: "",
    email: "",
    salonName: "",
    establishmentType: typeof window !== "undefined"
      ? getEstablishmentTypeByHostname(window.location.hostname)
      : EstablishmentType.Salon,
  })
  const [couponCode, setCouponCode] = useState("")
  const [couponResult, setCouponResult] = useState<CouponValidationResultDto | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [screenshotIdx, setScreenshotIdx] = useState(0)
  const [previewPaused, setPreviewPaused] = useState(false)
  const [openModuleKey, setOpenModuleKey] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<"CreditCard" | "Pix">("CreditCard")
  const [pixData, setPixData] = useState<{ subscriptionId: string; qrCode: string; qrCodeBase64: string; expiresAt: string } | null>(null)
  const [pixStatus, setPixStatus] = useState<"pending" | "approved" | "failed">("pending")
  const [copied, setCopied] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // checkoutCompleted — used to skip DELETE /pending-change when checkout actually proceeded
  const checkoutCompletedRef = useRef(false)
  // Auth state for authenticated users visiting this page directly
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [resolvedPrices, setResolvedPrices] = useState<ResolvedPlanPriceDto[]>([])
  // Active subscription tracking for authenticated users
  const [activeSubscription, setActiveSubscription] = useState<{ status: string; tenantId: string | null } | null>(null)

  // Navbar scroll-aware
  const { scrollY } = useScroll()
  const navBlur = useTransform(scrollY, [0, 60], [0, 12])
  const navBgOpacity = useTransform(scrollY, [0, 80], [0.6, 0.95])

  // Hero parallax
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  })
  const heroY = useTransform(heroProgress, [0, 1], [0, shouldReduce ? 0 : 80])
  const heroOpacity = useTransform(heroProgress, [0, 0.8], [1, 0])
  const springHeroY = useSpring(heroY, { stiffness: 100, damping: 30 })

  useEffect(() => {
    const token = getAuthToken()
    setAuthToken(token)
    // Note: do NOT redirect authenticated users — they may be upgrading their plan
  }, [])

  useEffect(() => {
    const trackingKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"]
    const tracked: Record<string, string> = {}
    trackingKeys.forEach((key) => {
      const value = searchParams.get(key)
      if (value) tracked[key] = value
    })
    if (Object.keys(tracked).length > 0) {
      localStorage.setItem("voro_tracking", JSON.stringify({ ...tracked, captured_at: new Date().toISOString() }))
    }
  }, [searchParams])

  useEffect(() => {
    apiCall<SubscriptionPlanDto[]>(API_CONFIG.ENDPOINTS.SUBSCRIPTION_PLANS)
      .then((res) => {
        if (!res.hasError && res.data) setPlans(res.data)
      })
      .finally(() => setLoadingPlans(false))
  }, [])

  // Fetch resolved prices (user-specific). Falls back to plan raw prices on 401/error.
  useEffect(() => {
    const token = getAuthToken()
    if (!token) return
    secureApiCall<ResolvedPlanPriceDto[]>(API_CONFIG.ENDPOINTS.SUBSCRIPTION_RESOLVED_PRICES, { method: "GET" })
      .then((res) => {
        if (!res.hasError && res.data) setResolvedPrices(res.data)
      })
      .catch(() => { /* fall back to raw prices */ })
  }, [])

  // Fetch current subscription if authenticated, to determine if we should use change-plan endpoint
  useEffect(() => {
    const token = getAuthToken()
    if (!token) return
    secureApiCall<{ status: string; tenantId: string | null }>(API_CONFIG.ENDPOINTS.SUBSCRIPTION_ME, { method: "GET" })
      .then((res) => {
        if (!res.hasError && res.data) setActiveSubscription(res.data)
      })
      .catch(() => { /* ignore */ })
  }, [])

  // Auto-play entre tabs do product preview
  useEffect(() => {
    if (previewPaused) return
    const interval = setInterval(() => {
      setScreenshotIdx((i) => (i + 1) % SCREENSHOTS.length)
    }, 3500)
    return () => clearInterval(interval)
  }, [previewPaused])

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  const startPixPolling = (subscriptionId: string) => {
    stopPolling()
    pollingRef.current = setInterval(async () => {
      try {
        const res = await apiCall<{ status: string }>(
          `${API_CONFIG.ENDPOINTS.SUBSCRIPTION_PIX_STATUS}/${subscriptionId}`,
          { method: "GET" }
        )
        if (!res.hasError && res.data?.status) {
          const s = res.data.status.toLowerCase()
          if (s === "active") {
            setPixStatus("approved")
            stopPolling()
            setTimeout(() => {
              router.push("/prices/feedback?trial=false&pix=true")
            }, 2000)
          } else if (s === "cancelled") {
            setPixStatus("failed")
            stopPolling()
          }
        }
      } catch {
        // ignore polling errors
      }
    }, 3000)
  }

  const handleCopyPix = async () => {
    if (!pixData) return
    await navigator.clipboard.writeText(pixData.qrCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Resolved price helpers ────────────────────────────────────────────────

  function getResolvedPrice(plan: SubscriptionPlanDto): number {
    const found = resolvedPrices.find((r) => r.planId === plan.id)
    if (found) return found.displayPrice
    // Fallback to plan's raw promo or full price
    return isPlanPromoActive(plan) ? plan.promoPrice! : plan.monthlyPrice
  }

  function isResolvedPromoActive(plan: SubscriptionPlanDto): boolean {
    return getResolvedPrice(plan) < plan.monthlyPrice
  }

  // Whether the authenticated user has an active or trial subscription
  const hasActiveSubscription = activeSubscription
    ? (activeSubscription.status === "Active" || activeSubscription.status === "Trial")
    : false

  // Cancel any pending change when the checkout dialog closes without completion
  const handleCheckoutDialogClose = async () => {
    if (!checkoutCompletedRef.current && authToken && hasActiveSubscription) {
      await secureApiCall<unknown>(API_CONFIG.ENDPOINTS.SUBSCRIPTION_PENDING_CANCEL, { method: "DELETE" })
    }
    checkoutCompletedRef.current = false
    setSelectedPlan(null)
    setTermsAccepted(false)
    setError(null)
    setCouponCode("")
    setCouponResult(null)
    setCouponError(null)
  }

  const handleValidateCoupon = async () => {
    const code = couponCode.trim()
    if (!code) return
    setValidatingCoupon(true)
    setCouponError(null)
    setCouponResult(null)
    try {
      const res = await apiCall<CouponValidationResultDto>(
        `${API_CONFIG.ENDPOINTS.SUBSCRIPTION_COUPON}/${encodeURIComponent(code)}`
      )
      if (res.hasError || !res.data) {
        setCouponError("Cupom inválido ou expirado.")
      } else {
        setCouponResult(res.data)
      }
    } catch {
      setCouponError("Erro ao validar cupom.")
    } finally {
      setValidatingCoupon(false)
    }
  }

  const trialDays = couponResult?.trialDays ?? selectedPlan?.defaultTrialDays ?? 0

  const handleCheckout = async () => {
    if (!selectedPlan) return
    if (!form.name || !form.email || !form.salonName) {
      setError("Preencha todos os campos.")
      return
    }
    if (!termsAccepted) {
      setError("Você precisa aceitar os termos de uso para continuar.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        planId: selectedPlan.id,
        name: form.name,
        email: form.email,
        salonName: form.salonName,
        establishmentType: form.establishmentType,
        checkoutMethod: paymentMethod,
      }
      if (couponResult) body.couponCode = couponResult.code

      try {
        const tracking = localStorage.getItem("voro_tracking")
        if (tracking) {
          const parsed = JSON.parse(tracking)
          if (parsed.utm_source) body.utm_source = parsed.utm_source
          if (parsed.utm_medium) body.utm_medium = parsed.utm_medium
          if (parsed.utm_campaign) body.utm_campaign = parsed.utm_campaign
          if (parsed.utm_content) body.utm_content = parsed.utm_content
          if (parsed.utm_term) body.utm_term = parsed.utm_term
          if (parsed.fbclid) body.fbclid = parsed.fbclid
        }
      } catch { }

      // Use change-plan endpoint when the user already has an active/trial subscription
      const endpoint = hasActiveSubscription
        ? API_CONFIG.ENDPOINTS.SUBSCRIPTION_CHANGE_PLAN
        : API_CONFIG.ENDPOINTS.SUBSCRIPTION_CHECKOUT

      const caller = authToken ? secureApiCall : apiCall
      const res = await caller<CheckoutResultDto>(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      })
      if (res.hasError || !res.data) {
        setError(res.message ?? "Erro ao iniciar checkout.")
        return
      }
      try { localStorage.removeItem("voro_tracking") } catch { }
      if (res.data.isTrial) {
        checkoutCompletedRef.current = true
        router.push("/prices/feedback?trial=true")
      } else if (res.data.pixQrCode) {
        checkoutCompletedRef.current = true
        setPixData({
          subscriptionId: res.data.subscriptionId,
          qrCode: res.data.pixQrCode,
          qrCodeBase64: res.data.pixQrCodeBase64 ?? "",
          expiresAt: res.data.pixExpiresAt ?? "",
        })
        setPixStatus("pending")
        startPixPolling(res.data.subscriptionId)
      } else {
        checkoutCompletedRef.current = true
        window.location.href = res.data.checkoutUrl!
      }
    } catch {
      setError("Erro inesperado. Tente novamente.")
    } finally {
      setSubmitting(false)
    }
  }

  const prevScreen = () => {
    setScreenshotIdx((i) => (i - 1 + SCREENSHOTS.length) % SCREENSHOTS.length)
    setPreviewPaused(true)
  }
  const nextScreen = () => {
    setScreenshotIdx((i) => (i + 1) % SCREENSHOTS.length)
    setPreviewPaused(true)
  }

  const vp = useViewportVariants()

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── Navbar ── */}
      <motion.nav
        className="sticky top-0 z-50 border-b border-border/60"
        style={{
          backdropFilter: shouldReduce ? undefined : `blur(${navBlur}px)`,
          backgroundColor: `hsl(var(--background) / ${shouldReduce ? 0.95 : navBgOpacity.get()})`,
        }}
        initial={{ y: -64, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <motion.div
            className="flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Scissors className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-black text-lg tracking-tight">{branding.shortName}</span>
          </motion.div>
          <div className="flex items-center gap-2">
            <ColorSchemePicker />
            <ThemeToggle />
          </div>
        </div>
      </motion.nav>

      {/* ── Hero ── */}
      <section ref={heroRef} className="relative w-full px-4 sm:px-6 pt-20 pb-16 text-center overflow-hidden">
        {/* Background decorative blobs */}
        <motion.div
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-150 h-150 rounded-full bg-primary/5 blur-3xl"
          style={{ y: springHeroY, opacity: heroOpacity }}
          aria-hidden
        />
        <motion.div
          className="pointer-events-none absolute top-10 -left-32 w-72 h-72 rounded-full bg-primary/8 blur-3xl"
          animate={shouldReduce ? {} : { x: [0, 20, 0], y: [0, -10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        />
        <motion.div
          className="pointer-events-none absolute top-20 -right-32 w-80 h-80 rounded-full bg-blue-500/5 blur-3xl"
          animate={shouldReduce ? {} : { x: [0, -20, 0], y: [0, 15, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          aria-hidden
        />

        <motion.div style={{ y: springHeroY }} className="flex flex-col items-center relative z-10">
          <motion.div
            initial={shouldReduce ? {} : { opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-xs font-semibold">
              <Sparkles className="h-3 w-3 mr-1.5 text-primary" />
              Feito para {branding.establishmentLabelPlural} brasileiros
            </Badge>
          </motion.div>

          {/* Faixa de promoção — aparece quando há promo ativa para este usuário */}
          {!loadingPlans && plans.some((p) => isResolvedPromoActive(p)) && (() => {
            const promoPlans = plans.filter((p) => isResolvedPromoActive(p))
            const maxTrialDays = Math.max(...promoPlans.map((p) => p.defaultTrialDays ?? 0), 0)
            const earliestEnd = promoPlans
              .map((p) => p.promoEndsAt ?? null)
              .filter(Boolean)
              .sort()[0] ?? null
            const lowestPromo = Math.min(...promoPlans.map((p) => getResolvedPrice(p)))

            return (
              <motion.div
                initial={shouldReduce ? {} : { opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.06 }}
                className="mb-5 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 rounded-2xl border border-red-200 dark:border-red-900/60 bg-linear-to-r from-red-50 to-orange-50 dark:from-red-950/40 dark:to-orange-950/30 px-5 py-3 shadow-sm shadow-red-100 dark:shadow-none"
              >
                {/* Pulse + label */}
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                  <span className="text-sm font-black text-red-700 dark:text-red-400 uppercase tracking-wide">
                    Oferta especial
                  </span>
                </div>

                <span className="hidden sm:block h-4 w-px bg-red-200 dark:bg-red-800" />

                {/* Detalhes */}
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-red-700 dark:text-red-300">
                  <span className="font-semibold">
                    A partir de{" "}
                    <span className="font-black">
                      {lowestPromo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês
                    </span>
                  </span>
                  {maxTrialDays > 0 && (
                    <>
                      <span className="text-red-300 dark:text-red-700">·</span>
                      <span className="font-semibold">
                        <span className="font-black">{maxTrialDays} dias grátis</span> para testar
                      </span>
                    </>
                  )}
                  {earliestEnd && (
                    <>
                      <span className="text-red-300 dark:text-red-700">·</span>
                      <HeroPromoTimer endsAt={earliestEnd} />
                    </>
                  )}
                </div>
              </motion.div>
            )
          })()}

          <motion.h1
            initial={shouldReduce ? {} : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            className="text-4xl sm:text-6xl font-black tracking-tighter text-balance leading-tight mb-4"
          >
            Chega de cliente{" "}
            <span className="text-primary relative inline-block">
              que não aparece
              <motion.span
                className="absolute bottom-0 left-0 h-0.75 w-full bg-primary/40 rounded-full"
                initial={{ scaleX: 0, originX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.75, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
            .
          </motion.h1>

          <motion.p
            initial={shouldReduce ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.16 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 text-balance"
          >
            O Voro confirma o agendamento pelo WhatsApp automaticamente e enche sua agenda sem você
            precisar ligar para ninguém.
          </motion.p>

          <motion.div
            initial={shouldReduce ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.24 }}
            className="flex flex-wrap gap-3 justify-center"
          >
            <motion.div
              whileHover={shouldReduce ? {} : { scale: 1.04, y: -2 }}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <Button
                size="lg"
                asChild
                className="shadow-lg shadow-primary/25 relative overflow-hidden group"
              >
                <a href="#precos">
                  <motion.span
                    className="absolute inset-0 bg-white/10"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.4 }}
                  />
                  Testar 14 dias grátis — sem cartão
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </a>
              </Button>
            </motion.div>
            <motion.div
              whileHover={shouldReduce ? {} : { scale: 1.03, y: -2 }}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <Button size="lg" variant="outline" asChild>
                <Link href="/admin/sign-in">Já tenho conta</Link>
              </Button>
            </motion.div>
          </motion.div>

          <motion.p
            initial={shouldReduce ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.38 }}
            className="mt-4 text-xs text-muted-foreground flex items-center gap-1.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            Sem cartão de crédito · Cancele quando quiser · Suporte incluído
          </motion.p>

          {/* Floating stat pills */}
          <motion.div
            className="mt-10 flex flex-wrap gap-3 justify-center"
            initial={shouldReduce ? {} : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            {[
              { value: "−70%", label: "de no-shows" },
              { value: "+R$800", label: "recuperados/mês" },
              {
                value: `${Math.max(...(plans.length ? plans.map((p) => p.defaultTrialDays ?? 0) : [14]), 0) || 14} dias`,
                label: "grátis",
              },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="flex items-center gap-2 rounded-full border border-border/60 bg-background/80 backdrop-blur-sm px-4 py-1.5 shadow-sm"
                initial={shouldReduce ? {} : { opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.55 + i * 0.08, type: "spring", stiffness: 300 }}
                whileHover={shouldReduce ? {} : { y: -2, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
              >
                <span className="text-sm font-black text-primary">{stat.value}</span>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── Social proof (testimonials) ── */}
      <section className="bg-muted/30 border-y border-border/60 py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Section className="text-center mb-10">
            <motion.div
              className="flex justify-center gap-0.5 mb-3"
              variants={staggerFast}
              initial={shouldReduce ? "visible" : "hidden"}
              whileInView="visible"
              viewport={{ once: true }}
            >
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  variants={{
                    hidden: { opacity: 0, scale: 0, rotate: -30 },
                    visible: {
                      opacity: 1,
                      scale: 1,
                      rotate: 0,
                      transition: { type: "spring", stiffness: 400, damping: 15, delay: i * 0.07 },
                    },
                  }}
                >
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                </motion.div>
              ))}
            </motion.div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-1">
              {branding.establishmentLabelPlural.charAt(0).toUpperCase() + branding.establishmentLabelPlural.slice(1)} que já transformaram o negócio
            </h2>
            <p className="text-muted-foreground text-sm">
              Resultados reais de quem usa o Voro todos os dias
            </p>
          </Section>

          <div className="flex sm:grid sm:grid-cols-3 gap-4 overflow-x-auto pb-4 sm:pb-0 snap-x snap-mandatory scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible">
            {TESTIMONIALS.map((t, idx) => (
              <motion.div
                key={t.name}
                initial={shouldReduce ? {} : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.5,
                  ease: [0.22, 1, 0.36, 1],
                  delay: idx * 0.08,
                }}
                className="flex flex-col gap-3 p-5 rounded-2xl bg-background border border-border/60 min-w-[80vw] sm:min-w-0 snap-start shrink-0 sm:shrink"
                whileHover={
                  shouldReduce
                    ? {}
                    : {
                        y: -6,
                        boxShadow: "0 12px 32px rgba(0,0,0,0.1)",
                        transition: { type: "spring", stiffness: 300, damping: 18 },
                      }
                }
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-black text-primary">{t.avatar}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight">{t.name}</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">{t.meta}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  {t.result}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">"{t.text}"</p>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${
                        i < t.stars ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"
                      }`}
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Product preview ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
        <Section className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
            Veja o sistema em ação
          </h2>
          <p className="text-muted-foreground">Simples de usar, poderoso no dia a dia</p>
        </Section>

        {/* Tab buttons with animated indicator */}
        <div className="flex justify-center gap-2 mb-6 flex-wrap relative">
          {SCREENSHOTS.map((s, i) => (
            <motion.button
              key={s.label}
              onClick={() => { setScreenshotIdx(i); setPreviewPaused(true) }}
              className={`relative px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                i === screenshotIdx
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              whileHover={shouldReduce ? {} : { scale: 1.04 }}
              whileTap={shouldReduce ? {} : { scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              {i === screenshotIdx && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-full bg-primary shadow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{s.label}</span>
            </motion.button>
          ))}
        </div>

        {/* Auto-play progress bar */}
        {!previewPaused && (
          <div className="max-w-3xl mx-auto mb-2 px-1 hidden md:block">
            <div className="h-0.5 rounded-full bg-border overflow-hidden">
              <motion.div
                key={screenshotIdx}
                className="h-full bg-primary/50 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 3.5, ease: "linear" }}
              />
            </div>
          </div>
        )}

        {/* Desktop: browser frame */}
        <div
          className="hidden md:block relative max-w-3xl mx-auto"
          onMouseEnter={() => setPreviewPaused(true)}
          onMouseLeave={() => setPreviewPaused(false)}
        >
          <motion.div
            className="absolute inset-0 -z-10 rounded-2xl bg-primary/10 blur-3xl scale-95"
            animate={shouldReduce ? {} : { opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
            initial={shouldReduce ? {} : { opacity: 0, y: 32, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/60 border-b border-border">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-400/80" />
                <div className="h-3 w-3 rounded-full bg-amber-400/80" />
                <div className="h-3 w-3 rounded-full bg-green-400/80" />
              </div>
              <div className="flex-1 mx-4">
                <div className="rounded-md bg-background border border-border px-3 py-1 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-xs text-muted-foreground font-mono">
                    {branding.hostname}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-4 w-4 rounded bg-muted" />
                <div className="h-4 w-4 rounded bg-muted" />
              </div>
            </div>
            {/* App sidebar + content */}
            <div className="flex" style={{ height: 340 }}>
              <div className="w-44 bg-sidebar border-r border-border/60 flex flex-col gap-1 p-2 shrink-0">
                <div className="flex items-center gap-2 px-2 py-2 mb-2">
                  <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center shrink-0">
                    <Scissors className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <span className="text-xs font-black text-sidebar-foreground truncate">
                    {branding.shortName}
                  </span>
                </div>
                {SCREENSHOTS.map(({ icon: Icon, label }, idx) => (
                  <button
                    key={label}
                    onClick={() => { setScreenshotIdx(idx); setPreviewPaused(true) }}
                    className={`flex items-center gap-2 px-2 py-2 rounded-lg transition-colors w-full text-left ${
                      idx === screenshotIdx
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-medium truncate">{label}</span>
                  </button>
                ))}
              </div>
              <div className="flex-1 bg-background overflow-hidden relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={screenshotIdx}
                    className="absolute inset-0"
                    initial={shouldReduce ? {} : { opacity: 0, x: 20, filter: "blur(4px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    exit={shouldReduce ? {} : { opacity: 0, x: -20, filter: "blur(4px)" }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {SCREENSHOTS[screenshotIdx].content}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
          {/* Caption + arrows */}
          <div className="flex items-center justify-between mt-4 px-1">
            <motion.button
              onClick={prevScreen}
              className="h-8 w-8 rounded-full border border-border bg-background flex items-center justify-center hover:bg-muted transition-colors"
              whileHover={shouldReduce ? {} : { scale: 1.1 }}
              whileTap={shouldReduce ? {} : { scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <ChevronLeft className="h-4 w-4" />
            </motion.button>
            <AnimatePresence mode="wait">
              <motion.div
                key={screenshotIdx}
                className="text-center"
                initial={shouldReduce ? {} : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduce ? {} : { opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-sm font-semibold text-foreground">
                  {SCREENSHOTS[screenshotIdx].label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {SCREENSHOTS[screenshotIdx].description}
                </p>
              </motion.div>
            </AnimatePresence>
            <motion.button
              onClick={nextScreen}
              className="h-8 w-8 rounded-full border border-border bg-background flex items-center justify-center hover:bg-muted transition-colors"
              whileHover={shouldReduce ? {} : { scale: 1.1 }}
              whileTap={shouldReduce ? {} : { scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <ChevronRight className="h-4 w-4" />
            </motion.button>
          </div>
          <div className="flex justify-center gap-1.5 mt-3">
            {SCREENSHOTS.map((_, i) => (
              <motion.button
                key={i}
                onClick={() => { setScreenshotIdx(i); setPreviewPaused(true) }}
                className="rounded-full bg-muted-foreground/30 overflow-hidden"
                animate={{ width: i === screenshotIdx ? 20 : 6, height: 6 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                {i === screenshotIdx && (
                  <motion.div
                    className="h-full w-full bg-primary"
                    layoutId="dot-indicator"
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  />
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Mobile: phone frame */}
        <div className="flex md:hidden flex-col items-center gap-6">
          <motion.div
            className="relative"
            initial={shouldReduce ? {} : { opacity: 0, scale: 0.9, y: 20 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="absolute inset-0 -z-10 bg-primary/15 blur-2xl scale-90 rounded-[3rem]" />
            <div className="relative w-57.5 rounded-[2.5rem] border-[6px] border-foreground/10 bg-foreground/10 shadow-2xl overflow-hidden">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 h-5 w-20 rounded-full bg-black/80" />
              <div className="rounded-4xl overflow-hidden bg-background">
                <div className="flex items-center justify-between px-4 pt-7 pb-1 bg-background">
                  <span className="text-[9px] font-bold text-foreground/70">9:41</span>
                  <div className="flex items-center gap-1">
                    <div className="flex gap-0.5 items-end">
                      {[3, 5, 7, 9].map((h) => (
                        <div key={h} className="w-0.5 rounded-sm bg-foreground/70" style={{ height: h }} />
                      ))}
                    </div>
                    <div className="w-3.5 h-2 rounded-sm border border-foreground/70 relative">
                      <div className="absolute inset-[1.5px] rounded-[1px] bg-foreground/70 w-2/3" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
                  <div className="flex items-center gap-1.5">
                    <div className="h-5 w-5 rounded-md bg-primary flex items-center justify-center">
                      <Scissors className="h-2.5 w-2.5 text-primary-foreground" />
                    </div>
                    <span className="text-[10px] font-black text-foreground">{branding.shortName}</span>
                  </div>
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-primary">JS</span>
                  </div>
                </div>
                <div className="overflow-hidden relative" style={{ height: 340 }}>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={screenshotIdx}
                      className="absolute inset-0"
                      initial={shouldReduce ? {} : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={shouldReduce ? {} : { opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {SCREENSHOTS[screenshotIdx].content}
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div className="flex items-center gap-1 px-2 py-2 border-t border-border/60 bg-background overflow-x-auto">
                  {SCREENSHOTS.map(({ icon: Icon, label }, i) => (
                    <button
                      key={label}
                      onClick={() => { setScreenshotIdx(i); setPreviewPaused(true) }}
                      className={`flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg transition-colors shrink-0 ${
                        i === screenshotIdx ? "text-primary bg-primary/10" : "text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="text-[7px] font-semibold">{label}</span>
                    </button>
                  ))}
                </div>
                <div className="flex justify-center pb-2 pt-1 bg-background">
                  <div className="w-16 h-1 rounded-full bg-foreground/20" />
                </div>
              </div>
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={screenshotIdx}
              className="text-center"
              initial={shouldReduce ? {} : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduce ? {} : { opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-sm font-semibold text-foreground">
                {SCREENSHOTS[screenshotIdx].label}
              </p>
              <p className="text-xs text-muted-foreground">
                {SCREENSHOTS[screenshotIdx].description}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-center gap-1.5">
            {SCREENSHOTS.map((_, i) => (
              <motion.button
                key={i}
                onClick={() => setScreenshotIdx(i)}
                className="rounded-full bg-muted-foreground/30 overflow-hidden"
                animate={{ width: i === screenshotIdx ? 20 : 6, height: 6 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                {i === screenshotIdx && (
                  <div className="h-full w-full bg-primary" />
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section className="bg-muted/30 border-y border-border/60 py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Section className="text-center mb-10">
            <h2 className="text-2xl font-black tracking-tight">Tudo que seu {branding.establishmentLabel} precisa</h2>
          </Section>
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-4 gap-4"
            variants={stagger}
            initial={shouldReduce ? "visible" : "hidden"}
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            {FEATURES.map(({ icon: Icon, label }) => (
              <motion.div
                key={label}
                variants={fadeUp}
                className="group flex flex-col items-center gap-2 p-4 rounded-2xl bg-background border border-border/60 text-center cursor-default"
                whileHover={
                  shouldReduce
                    ? {}
                    : {
                        y: -6,
                        borderColor: "hsl(var(--primary) / 0.4)",
                        boxShadow: "0 8px 24px hsl(var(--primary) / 0.1)",
                        transition: { type: "spring", stiffness: 300, damping: 18 },
                      }
                }
              >
                <motion.div
                  className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"
                  whileHover={shouldReduce ? {} : { scale: 1.15, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  <Icon className="h-5 w-5 text-primary" />
                </motion.div>
                <span className="text-sm font-semibold">{label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Impact (no-show calculator) ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <motion.div
          className="rounded-3xl bg-primary/5 border border-primary/20 p-8 sm:p-12 text-center relative overflow-hidden"
          initial={shouldReduce ? {} : { opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Decorative orbs */}
          <div className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-primary/8 blur-3xl" />

          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            O custo do no-show
          </p>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight mb-4 text-balance">
            Cada cliente que falta é dinheiro que some
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-10 text-balance">
            Se você perde apenas 3 clientes por semana com ticket médio de R$80, calcule o prejuízo:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
            {[
              { label: "Por semana", value: 240, prefix: "R$", color: "text-orange-500" },
              { label: "Por mês", value: 960, prefix: "R$", color: "text-red-500" },
              { label: "Por ano", value: 11520, prefix: "R$", color: "text-destructive" },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                className="flex flex-col items-center gap-1"
                initial={shouldReduce ? {} : { opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.1,
                  type: "spring",
                  stiffness: 200,
                }}
              >
                <span className={`text-4xl sm:text-5xl font-black ${item.color}`}>
                  <CountUp target={item.value} prefix={item.prefix} />
                </span>
                <span className="text-sm text-muted-foreground font-medium">{item.label}</span>
              </motion.div>
            ))}
          </div>

          <motion.div
            whileHover={shouldReduce ? {} : { scale: 1.04, y: -2 }}
            whileTap={shouldReduce ? {} : { scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="inline-block"
          >
            <Button size="lg" asChild className="shadow-lg shadow-primary/20">
              <a href="#precos">
                Eliminar no-shows agora <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* ── WhatsApp differentiator ── */}
      <section className="py-14 px-4">
        <div className="max-w-3xl mx-auto">
          <Section className="text-center mb-8">
            <Badge variant="secondary" className="mb-4">Diferencial exclusivo</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              Enquanto outros mandam SMS que ninguém lê,
              <br className="hidden sm:block" /> o Voro manda WhatsApp.
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              97% dos brasileiros usam WhatsApp todos os dias. Seus lembretes de agendamento deveriam
              estar lá também.
            </p>
          </Section>

          <motion.div
            {...vp}
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <motion.div variants={fadeUp}>
              <Card className="border-border bg-muted/40 h-full">
                <CardContent className="pt-5 pb-5">
                  <p className="font-semibold text-muted-foreground mb-3 text-sm uppercase tracking-wider">
                    Outros sistemas
                  </p>
                  <ul className="flex flex-col gap-2.5">
                    {[
                      "SMS que vai para spam",
                      "Lembrete pago à parte",
                      "Cliente não vê, não responde",
                      "Você liga de volta manualmente",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-red-500 text-xs font-bold">
                          ✕
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              variants={fadeUp}
              whileHover={
                shouldReduce
                  ? {}
                  : {
                      y: -4,
                      boxShadow: "0 12px 32px hsl(var(--primary) / 0.15)",
                      transition: { type: "spring", stiffness: 300, damping: 20 },
                    }
              }
            >
              <Card className="border-primary bg-primary/5 h-full">
                <CardContent className="pt-5 pb-5">
                  <p className="font-semibold text-primary mb-3 text-sm uppercase tracking-wider">
                    {branding.shortName}
                  </p>
                  <ul className="flex flex-col gap-2.5">
                    {[
                      "WhatsApp que todo mundo abre",
                      "Incluído no plano Pro",
                      "Cliente confirma com 1 toque",
                      "Você não faz nada",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── No-show cost calculator ── */}
      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto rounded-2xl border bg-muted/40 px-6 py-10">
          <Section className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              Quanto custa não ter lembrete automático?
            </h2>
            <p className="text-muted-foreground">
              A maioria dos {branding.establishmentLabelPlural} perde entre 1 e 3 agendamentos por semana por falta de confirmação.
              Veja o impacto:
            </p>
          </Section>

          <motion.div
            {...vp}
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
          >
            {[
              {
                icon: TrendingUp,
                iconColor: "text-destructive",
                border: "border-destructive/30",
                bg: "bg-destructive/5",
                sub: "1 falta/semana",
                value: "R$ 480",
                unit: "/mês perdidos",
                valueColor: "text-destructive",
                note: "Média de R$ 120 por atendimento",
              },
              {
                icon: Wallet,
                iconColor: "text-muted-foreground",
                border: "border-border",
                bg: "bg-background",
                sub: "O Voro Pro custa",
                value: "R$ 79",
                unit: "/mês",
                valueColor: "",
                note: "Confirmação automática via WhatsApp",
              },
              {
                icon: Star,
                iconColor: "text-green-600",
                border: "border-green-500/30",
                bg: "bg-green-500/5",
                sub: "Você fica com",
                value: "+ R$ 401",
                unit: "/mês no bolso",
                valueColor: "text-green-600",
                note: "Só recuperando 1 falta por semana",
              },
            ].map(({ icon: Icon, iconColor, border, bg, sub, value, unit, valueColor, note }) => (
              <motion.div
                key={sub}
                variants={scaleIn}
                whileHover={
                  shouldReduce ? {} : { y: -4, transition: { type: "spring", stiffness: 300 } }
                }
              >
                <Card className={`text-center ${border} ${bg}`}>
                  <CardContent className="pt-6 pb-5">
                    <Icon className={`h-7 w-7 mx-auto mb-3 ${iconColor}`} />
                    <p className="text-sm text-muted-foreground mb-1">{sub}</p>
                    <p className={`text-2xl font-black ${valueColor}`}>
                      {value}
                      <span className="text-base font-semibold">{unit}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{note}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          <motion.p
            initial={shouldReduce ? {} : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-center text-base font-semibold text-primary"
          >
            O sistema se paga com a primeira cliente que não faltou.
          </motion.p>
        </div>
      </section>

      {/* ── Comparison table ── */}
      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <Section className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
              Por que o Voro e não as plataformas tradicionais?
            </h2>
            <p className="text-muted-foreground">Veja a diferença na prática</p>
          </Section>

          <motion.div
            initial={shouldReduce ? {} : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="overflow-x-auto rounded-xl border shadow-sm"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-2/5">
                    Funcionalidade
                  </th>
                  <th className="px-4 py-3 text-center w-[30%] bg-primary/5 border-x border-primary/20">
                    <span className="font-bold text-primary block mb-1">{branding.shortName}</span>
                    <Badge className="text-[10px] px-2 py-0">Recomendado</Badge>
                  </th>
                  <th className="px-4 py-3 text-center font-medium w-[30%]">Plataformas tradicionais</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    feature: "Lembrete WhatsApp",
                    voro: { icon: "✅", text: "Nativo e automático", color: "text-green-600" },
                    plataformas_tradicionais: { icon: "❌", text: "SMS pago à parte", color: "text-muted-foreground" },
                  },
                  {
                    feature: "Trial sem cartão",
                    voro: { icon: "✅", text: "14 dias", color: "text-green-600" },
                    plataformas_tradicionais: { icon: "❌", text: "5 dias", color: "text-muted-foreground" },
                  },
                  {
                    feature: "App mobile",
                    voro: { icon: "✅", text: "iOS + Android", color: "text-green-600" },
                    plataformas_tradicionais: { icon: "✅", text: "Sim", color: "text-green-600" },
                  },
                  {
                    feature: "Financeiro",
                    voro: { icon: "✅", text: "Incluso no Pro", color: "text-green-600" },
                    plataformas_tradicionais: { icon: "⚠️", text: "Básico", color: "text-yellow-600" },
                  },
                  {
                    feature: "Agendamento online",
                    voro: { icon: "✅", text: "Link público", color: "text-green-600" },
                    plataformas_tradicionais: { icon: "✅", text: "Sim", color: "text-green-600" },
                  },
                  {
                    feature: "Preço mensal",
                    voro: { icon: "", text: "R$ 79/mês", color: "font-bold text-primary" },
                    plataformas_tradicionais: { icon: "", text: "R$ 65/mês", color: "font-semibold" },
                  },
                ].map((row, i) => (
                  <motion.tr
                    key={i}
                    className={`border-b last:border-0 ${i % 2 === 0 ? "bg-muted/20" : ""}`}
                    initial={shouldReduce ? {} : { opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: i * 0.06 }}
                  >
                    <td className="px-4 py-3 font-medium">{row.feature}</td>
                    <td
                      className={`px-4 py-3 text-center bg-primary/5 border-x border-primary/20 ${row.voro.color}`}
                    >
                      {row.voro.icon} {row.voro.text}
                    </td>
                    <td className={`px-4 py-3 text-center ${row.plataformas_tradicionais.color}`}>
                      {row.plataformas_tradicionais.icon} {row.plataformas_tradicionais.text}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>

          <motion.p
            initial={shouldReduce ? {} : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-center text-xs text-muted-foreground mt-4 max-w-md mx-auto"
          >
            A diferença de R$ 14/mês é o custo do WhatsApp automático. Um lembrete que evita 1 falta
            por mês já cobre essa diferença.
          </motion.p>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="precos" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <Section className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
            Planos simples e transparentes
          </h2>
          <p className="text-muted-foreground text-lg">Sem taxa de adesão. Cancele quando quiser.</p>
        </Section>

        {loadingPlans ? (
          <div className="flex justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="h-8 w-8 text-primary" />
            </motion.div>
          </div>
        ) : (
          <>
            <motion.p
              className="text-center text-sm text-muted-foreground mb-6"
              initial={shouldReduce ? {} : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
            >
              Plano Pro a partir de R$ 2,63 por dia — menos que um cafezinho.
            </motion.p>

            {(() => {
              const promoPlans = plans.filter((p) => isResolvedPromoActive(p))
              if (promoPlans.length === 0) return null
              // Usa a menor data de expiração entre os planos com promo resolvida
              const earliest = promoPlans
                .map((p) => p.promoEndsAt ?? null)
                .filter(Boolean)
                .sort()[0] ?? null
              return <PromoCountdown endsAt={earliest} />
            })()}

            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start"
              variants={stagger}
              initial={shouldReduce ? "visible" : "hidden"}
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
            >
              {(() => {
                // Se todos os planos com promo resolvida têm a mesma data, não repete a data nos cards
                const promoEndDates = plans
                  .filter((p) => isResolvedPromoActive(p))
                  .map((p) => p.promoEndsAt ?? "")
                  .filter(Boolean)
                const allSamePromoDate = new Set(promoEndDates).size <= 1
                return plans.map((plan, i) => {
                  const rp = resolvedPrices.find((r) => r.planId === plan.id)
                  return (
                    <motion.div
                      key={plan.id}
                      variants={fadeUp}
                      whileHover={{ y: -4, transition: { type: "spring", stiffness: 400, damping: 25 } }}
                    >
                      <PlanCard
                        plan={plan}
                        popular={i === 1}
                        showPromoDate={!allSamePromoDate}
                        onSelect={setSelectedPlan}
                        onModuleInfo={setOpenModuleKey}
                        displayPrice={rp?.displayPrice}
                      />
                    </motion.div>
                  )
                })
              })()}
            </motion.div>
          </>
        )}
      </section>

      {/* ── FAQ ── */}
      <section className="bg-muted/30 border-y border-border/60 py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <Section className="text-center mb-8">
            <h2 className="text-2xl font-black tracking-tight">Perguntas frequentes</h2>
          </Section>
          <motion.div
            className="flex flex-col gap-2"
            variants={stagger}
            initial={shouldReduce ? "visible" : "hidden"}
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            {FAQ.map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="border border-border/60 rounded-xl bg-background overflow-hidden"
                whileHover={
                  shouldReduce ? {} : { borderColor: "hsl(var(--primary) / 0.3)" }
                }
                transition={{ duration: 0.2 }}
              >
                <button
                  className="w-full text-left px-5 py-4 font-semibold text-sm flex items-center justify-between gap-2"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  {item.q}
                  <motion.span
                    animate={{ rotate: openFaq === i ? 45 : 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="text-muted-foreground shrink-0 text-lg leading-none"
                  >
                    +
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-4 text-sm text-muted-foreground">{item.a}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
        <motion.div
          initial={shouldReduce ? {} : { opacity: 0, y: 32, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl border border-primary/20 bg-primary/5 p-10 relative overflow-hidden"
        >
          <div className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-primary/8 blur-3xl" />
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-3 relative">
            Comece hoje, transforme seu {branding.establishmentLabel} esta semana
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            14 dias grátis, sem cartão de crédito. Configure em minutos e reduza no-shows ainda neste mês.
          </p>
          <motion.div
            whileHover={shouldReduce ? {} : { scale: 1.04, y: -2 }}
            whileTap={shouldReduce ? {} : { scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="inline-block"
          >
            <Button size="lg" asChild className="shadow-lg shadow-primary/25 relative overflow-hidden">
              <a href="#precos">
                <motion.span
                  className="absolute inset-0 bg-white/10"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "100%" }}
                  transition={{ duration: 0.4 }}
                />
                Testar grátis agora
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </motion.div>
          <p className="mt-4 text-xs text-muted-foreground">
            Sem cartão · Cancele quando quiser · Suporte incluído
          </p>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground border-t border-border/40">
        <motion.div
          className="flex items-center gap-2"
          initial={shouldReduce ? {} : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
            <Scissors className="h-3 w-3 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground">{branding.productName}</span>
          <span>© {new Date().getFullYear()}</span>
        </motion.div>
        <div className="flex gap-4">
          <Link href="/admin/sign-in" className="hover:text-foreground transition-colors">
            Entrar
          </Link>
          <a href="mailto:contato@vorolabs.app" className="hover:text-foreground transition-colors">
            Contato
          </a>
        </div>
      </footer>

      {/* ── Checkout Dialog ── */}
      <Dialog
        open={!!selectedPlan}
        onOpenChange={(o) => { if (!o) { handleCheckoutDialogClose() } }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assinar plano {selectedPlan?.name}</DialogTitle>
            <DialogDescription asChild>
              <div>
                <span>
                  {selectedPlan
                    ? getResolvedPrice(selectedPlan).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                    : ""}
                  /mês
                </span>
                {selectedPlan && isResolvedPromoActive(selectedPlan) && (
                  <span className="ml-2 text-muted-foreground line-through text-xs">
                    {selectedPlan.monthlyPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                )}
                {trialDays > 0 && (
                  <span className="ml-1 text-green-600 dark:text-green-400 font-medium">
                    — {trialDays} dias de trial grátis incluídos
                  </span>
                )}
                {selectedPlan && isResolvedPromoActive(selectedPlan) && (
                  <p className="text-xs text-green-600 dark:text-green-400 font-semibold mt-1">
                    Preço promocional garantido enquanto você mantiver a assinatura ativa
                  </p>
                )}
                {selectedPlan && !isResolvedPromoActive(selectedPlan) && isPlanPromoActive(selectedPlan) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Promoção disponível apenas para novos clientes e upgrades
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label>Seu nome</Label>
              <Input
                placeholder="João Silva"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>E-mail</Label>
              <Input
                type="email"
                placeholder="joao@meusalao.com"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Nome do {branding.establishmentLabel}</Label>
              <Input
                placeholder={`${branding.establishmentLabel.charAt(0).toUpperCase() + branding.establishmentLabel.slice(1)} Beleza Total`}
                value={form.salonName}
                onChange={(e) => setForm((p) => ({ ...p, salonName: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Tipo de estabelecimento</Label>
              <Select
                value={String(form.establishmentType)}
                onValueChange={(v) => setForm((p) => ({ ...p, establishmentType: Number(v) as EstablishmentType }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={String(EstablishmentType.Salon)}>Cabeleireiro / Salão</SelectItem>
                  <SelectItem value={String(EstablishmentType.Barber)}>Barbearia</SelectItem>
                  <SelectItem value={String(EstablishmentType.NailsLashes)}>Unhas e Cílios (Lashes)</SelectItem>
                  <SelectItem value={String(EstablishmentType.EstheticsClinic)}>Estética e Clínica</SelectItem>
                  <SelectItem value={String(EstablishmentType.SpaMassage)}>Spa e Massagem</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>
                Cupom <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: VORO10"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase())
                    setCouponResult(null)
                    setCouponError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleValidateCoupon()
                  }}
                  className="uppercase"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleValidateCoupon}
                  disabled={!couponCode.trim() || validatingCoupon}
                  className="shrink-0"
                >
                  {validatingCoupon ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Aplicar"
                  )}
                </Button>
              </div>
              <AnimatePresence>
                {couponResult && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-sm text-green-600 dark:text-green-400 font-medium"
                  >
                    ✓ Cupom válido — {couponResult.trialDays} dias de trial grátis!
                    {couponResult.description && (
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        ({couponResult.description})
                      </span>
                    )}
                  </motion.p>
                )}
                {couponError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-sm text-destructive"
                  >
                    {couponError}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Método de pagamento */}
            {trialDays === 0 && (
              <div className="flex flex-col gap-1.5">
                <Label>Forma de pagamento</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CreditCard")}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all text-sm font-medium ${
                      paymentMethod === "CreditCard"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <CreditCard className="h-5 w-5" />
                    Cartão
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("Pix")}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all text-sm font-medium ${
                      paymentMethod === "Pix"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <QrCode className="h-5 w-5" />
                    Pix
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2.5 pt-1">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(v) => setTermsAccepted(!!v)}
              />
              <label
                htmlFor="terms"
                className="text-sm text-muted-foreground leading-snug cursor-pointer select-none"
              >
                Li e aceito os{" "}
                <button
                  type="button"
                  onClick={() => setShowTerms(true)}
                  className="text-primary font-medium hover:underline"
                >
                  termos de uso
                </button>
              </label>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-destructive font-medium"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.div
              whileHover={shouldReduce ? {} : { scale: 1.02 }}
              whileTap={shouldReduce ? {} : { scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <Button
                onClick={handleCheckout}
                disabled={submitting || !termsAccepted}
                className="w-full mt-1"
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {trialDays > 0 ? "Iniciar trial grátis" : paymentMethod === "Pix" ? "Gerar QR Code Pix" : "Ir para pagamento"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Pix QR Code Dialog ── */}
      <Dialog open={!!pixData} onOpenChange={(o) => { if (!o) { setPixData(null); stopPolling() } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Pagar com Pix
            </DialogTitle>
            <DialogDescription>
              Escaneie o QR Code ou copie o código Pix copia e cola.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {pixStatus === "approved" ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <p className="font-bold text-green-600">Pagamento confirmado!</p>
                <p className="text-sm text-muted-foreground text-center">Sua conta está sendo criada...</p>
              </div>
            ) : pixStatus === "failed" ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <p className="font-bold text-destructive">Pagamento não aprovado</p>
                <p className="text-sm text-muted-foreground text-center">Tente novamente ou escolha outro método.</p>
                <Button variant="outline" size="sm" onClick={() => setPixData(null)}>
                  Tentar novamente
                </Button>
              </div>
            ) : (
              <>
                {pixData?.qrCodeBase64 && (
                  <div className="flex justify-center">
                    <div className="rounded-xl border border-border p-2 bg-white">
                      <Image
                        src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                        alt="QR Code Pix"
                        width={192}
                        height={192}
                        className="rounded-lg"
                      />
                    </div>
                  </div>
                )}
                <div className="rounded-lg bg-muted/60 p-3 flex items-start gap-2">
                  <p className="text-xs font-mono text-muted-foreground break-all flex-1 line-clamp-3">
                    {pixData?.qrCode}
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                    title="Copiar código Pix"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <Button variant="outline" className="w-full" onClick={handleCopyPix}>
                  {copied ? (
                    <><Check className="mr-2 h-4 w-4 text-green-500" />Copiado!</>
                  ) : (
                    <><Copy className="mr-2 h-4 w-4" />Copiar código Pix</>
                  )}
                </Button>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Aguardando confirmação do pagamento...
                </div>
                {pixData?.expiresAt && (
                  <p className="text-center text-xs text-muted-foreground">
                    Expira em {new Date(pixData.expiresAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Terms Dialog ── */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-2xl flex flex-col">
          <DialogHeader>
            <DialogTitle>Termos de Uso — {branding.productName}</DialogTitle>
            <DialogDescription>Última atualização: março de 2025</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[55vh] pr-2 mt-2">
            <div className="text-sm text-muted-foreground space-y-5 leading-relaxed">
              <section>
                <h3 className="font-semibold text-foreground mb-1">1. Aceitação dos Termos</h3>
                <p>
                  Ao assinar um plano e utilizar o {branding.productName}, você concorda com estes Termos de
                  Uso. Caso não concorde com qualquer disposição, não utilize o serviço.
                </p>
              </section>
              <section>
                <h3 className="font-semibold text-foreground mb-1">2. Descrição do Serviço</h3>
                <p>
                  O {branding.productName} é uma plataforma SaaS de gestão para {branding.establishmentLabel}s, oferecendo
                  funcionalidades de agendamento, cadastro de clientes, controle de serviços, gestão
                  financeira e relatórios, conforme o plano contratado.
                </p>
              </section>
              <section>
                <h3 className="font-semibold text-foreground mb-1">3. Cadastro e Conta</h3>
                <p>
                  Você é responsável por manter a confidencialidade de suas credenciais de acesso.
                  Compromete-se a fornecer informações verdadeiras, precisas e atualizadas no momento
                  do cadastro. A Vorolabs reserva-se o direito de suspender contas com informações
                  falsas.
                </p>
              </section>
              <section>
                <h3 className="font-semibold text-foreground mb-1">4. Pagamento e Assinatura</h3>
                <p>
                  O pagamento é realizado mensalmente de forma recorrente via MercadoPago. Os valores
                  podem ser atualizados mediante aviso prévio de 30 dias. O não pagamento pode resultar
                  na suspensão do acesso à plataforma.
                </p>
              </section>
              <section>
                <h3 className="font-semibold text-foreground mb-1">5. Cancelamento</h3>
                <p>
                  Você pode cancelar sua assinatura a qualquer momento sem multa. O acesso permanece
                  ativo até o fim do período já pago. Não há reembolso proporcional de períodos não
                  utilizados.
                </p>
              </section>
              <section>
                <h3 className="font-semibold text-foreground mb-1">6. Propriedade dos Dados</h3>
                <p>
                  Todos os dados inseridos na plataforma (clientes, agendamentos, financeiro) pertencem
                  a você. A Vorolabs não compartilha nem comercializa seus dados com terceiros. Em caso
                  de cancelamento, você pode solicitar a exportação dos seus dados em até 30 dias após
                  o encerramento.
                </p>
              </section>
              <section>
                <h3 className="font-semibold text-foreground mb-1">7. Privacidade</h3>
                <p>
                  O tratamento de dados pessoais segue a Lei Geral de Proteção de Dados (LGPD — Lei nº
                  13.709/2018). Ao utilizar o serviço, você consente com a coleta e uso dos dados
                  necessários para a prestação do serviço conforme nossa Política de Privacidade.
                </p>
              </section>
              <section>
                <h3 className="font-semibold text-foreground mb-1">8. Uso Permitido</h3>
                <p>
                  O serviço deve ser utilizado exclusivamente para fins legais e relacionados à gestão
                  do seu negócio. É proibido utilizar a plataforma para atividades ilícitas, spam,
                  engenharia reversa ou qualquer ação que prejudique outros usuários ou a infraestrutura
                  do serviço.
                </p>
              </section>
              <section>
                <h3 className="font-semibold text-foreground mb-1">9. Disponibilidade</h3>
                <p>
                  A Vorolabs envidará melhores esforços para manter o serviço disponível 24/7, mas não
                  garante disponibilidade ininterrupta. Manutenções programadas serão comunicadas com
                  antecedência sempre que possível.
                </p>
              </section>
              <section>
                <h3 className="font-semibold text-foreground mb-1">10. Limitação de Responsabilidade</h3>
                <p>
                  A Vorolabs não se responsabiliza por perdas indiretas, lucros cessantes ou danos
                  decorrentes do uso ou impossibilidade de uso do serviço. Nossa responsabilidade total
                  está limitada ao valor pago nos últimos 3 meses de assinatura.
                </p>
              </section>
              <section>
                <h3 className="font-semibold text-foreground mb-1">11. Alterações nos Termos</h3>
                <p>
                  Estes termos podem ser atualizados a qualquer momento. Você será notificado por
                  e-mail com 15 dias de antecedência. O uso continuado após a vigência das alterações
                  implica aceitação.
                </p>
              </section>
              <section>
                <h3 className="font-semibold text-foreground mb-1">12. Contato</h3>
                <p>
                  Dúvidas sobre estes termos podem ser enviadas para{" "}
                  <a href="mailto:contato@vorolabs.app" className="text-primary hover:underline">
                    contato@vorolabs.app
                  </a>
                  .
                </p>
              </section>
            </div>
          </div>
          <div className="pt-4 border-t border-border mt-2">
            <Button
              className="w-full"
              onClick={() => {
                setShowTerms(false)
                setTermsAccepted(true)
              }}
            >
              Li e aceito os termos
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Module Info Dialog ── */}
      <ModuleInfoDialog moduleKey={openModuleKey} onClose={() => setOpenModuleKey(null)} />

      {/* ── WhatsApp floating button ── */}
      <motion.a
        href="https://wa.me/555196106982?text=Ol%C3%A1!%20Tenho%20interesse%20no%20Voro%20Salon%20e%20gostaria%20de%20saber%20mais."
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Fale conosco no WhatsApp"
        title="Fale conosco no WhatsApp"
        className="fixed bottom-6 right-6 z-50 group"
        initial={shouldReduce ? {} : { scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 1.2 }}
        whileHover={shouldReduce ? {} : { scale: 1.12 }}
        whileTap={shouldReduce ? {} : { scale: 0.95 }}
      >
        <motion.span
          className="absolute inset-0 rounded-full bg-[#25D366]"
          animate={shouldReduce ? {} : { scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg shadow-black/20">
          <MessageCircle className="h-7 w-7 fill-white text-white" strokeWidth={1.5} />
        </span>
      </motion.a>

      <LegalFooter />
    </div>
  )
}
