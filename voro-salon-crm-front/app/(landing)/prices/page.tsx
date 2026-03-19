"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  CheckCircle2, Scissors, BarChart3, Users, Calendar, ClipboardList,
  Wallet, Zap, ArrowRight, Loader2, ChevronLeft, ChevronRight,
  Bell, Search, TrendingUp, Clock, Star,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { API_CONFIG, apiCall, getAuthToken } from "@/lib/api"
import type { SubscriptionPlanDto, CheckoutResultDto } from "@/types/subscription.interface"

// ── Static data ──────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: Calendar, label: "Agendamentos online" },
  { icon: Users, label: "Gestão de clientes" },
  { icon: Scissors, label: "Catálogo de serviços" },
  { icon: Users, label: "Controle de funcionários" },
  { icon: Wallet, label: "Financeiro integrado" },
  { icon: ClipboardList, label: "Ficha de anamnese" },
  { icon: BarChart3, label: "Relatórios e métricas" },
  { icon: Zap, label: "Acesso pelo celular" },
]

const FAQ = [
  {
    q: "Posso cancelar a qualquer momento?",
    a: "Sim. Você pode cancelar sua assinatura a qualquer momento sem multa. O acesso fica ativo até o fim do período pago.",
  },
  {
    q: "Como funciona o pagamento?",
    a: "O pagamento é mensal e recorrente via MercadoPago. Aceitamos cartão de crédito, débito e Pix.",
  },
  {
    q: "Posso mudar de plano depois?",
    a: "Sim! Entre em contato conosco e faremos o ajuste pro-rata na sua próxima fatura.",
  },
  {
    q: "Os dados do meu salão ficam seguros?",
    a: "Sim. Todos os dados são criptografados e armazenados com segurança. Somente você tem acesso.",
  },
  {
    q: "Preciso instalar algum programa?",
    a: "Não. O Voro Salon CRM funciona direto no navegador e também tem aplicativo para iOS e Android.",
  },
]

// ── Product screenshots (mockups) ─────────────────────────────────────────────

const SCREENSHOTS = [
  {
    label: "Dashboard",
    description: "Visão geral do seu salão em tempo real",
    content: <DashboardMockup />,
  },
  {
    label: "Agendamentos",
    description: "Gerencie todos os horários com facilidade",
    content: <AgendamentosMockup />,
  },
  {
    label: "Clientes",
    description: "Histórico completo de cada cliente",
    content: <ClientesMockup />,
  },
  {
    label: "Financeiro",
    description: "Receitas, despesas e fluxo de caixa",
    content: <FinanceiroMockup />,
  },
]

// ── Mockup components ─────────────────────────────────────────────────────────

function DashboardMockup() {
  return (
    <div className="flex flex-col gap-3 p-4 h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
            <Scissors className="h-3 w-3 text-primary-foreground" />
          </div>
          <div className="h-3 w-24 rounded-full bg-foreground/80" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center">
            <Bell className="h-3 w-3 text-muted-foreground" />
          </div>
          <div className="h-6 w-6 rounded-full bg-primary/20" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-1">
        {[
          { label: "Hoje", value: "12", sub: "agendamentos", color: "bg-primary/10 text-primary" },
          { label: "Receita", value: "R$840", sub: "este mês", color: "bg-green-500/10 text-green-600" },
          { label: "Clientes", value: "248", sub: "cadastrados", color: "bg-blue-500/10 text-blue-600" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-background p-2.5 flex flex-col gap-1">
            <span className="text-[9px] text-muted-foreground font-medium">{c.label}</span>
            <span className={`text-sm font-black rounded px-1 w-fit ${c.color}`}>{c.value}</span>
            <span className="text-[8px] text-muted-foreground">{c.sub}</span>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-background p-2.5 flex-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-semibold text-foreground">Próximos agendamentos</span>
          <TrendingUp className="h-3 w-3 text-primary" />
        </div>
        {[
          { name: "Ana Lima", service: "Coloração", time: "09:00" },
          { name: "Carla Souza", service: "Corte + Escova", time: "10:30" },
          { name: "Julia Matos", service: "Hidratação", time: "13:00" },
        ].map((a) => (
          <div key={a.name} className="flex items-center gap-2 py-1 border-b border-border/50 last:border-0">
            <div className="h-5 w-5 rounded-full bg-primary/20 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[8px] font-semibold text-foreground truncate">{a.name}</div>
              <div className="text-[7px] text-muted-foreground truncate">{a.service}</div>
            </div>
            <div className="flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5 text-muted-foreground" />
              <span className="text-[8px] text-muted-foreground">{a.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AgendamentosMockup() {
  const hours = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00"]
  const colors = ["bg-primary/20 border-primary/40", "bg-blue-500/20 border-blue-500/40", "bg-green-500/20 border-green-500/40", "bg-amber-500/20 border-amber-500/40"]
  return (
    <div className="flex flex-col gap-3 p-4 h-full">
      <div className="flex items-center justify-between">
        <div className="h-3 w-28 rounded-full bg-foreground/80" />
        <div className="flex gap-1.5">
          <div className="h-6 w-16 rounded-md bg-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center">+ Novo</div>
        </div>
      </div>
      <div className="flex gap-1 overflow-hidden">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d, i) => (
          <div key={d} className={`flex-1 rounded-lg p-1 text-center ${i === 2 ? "bg-primary text-primary-foreground" : "bg-muted/50"}`}>
            <div className={`text-[7px] font-medium ${i === 2 ? "text-primary-foreground" : "text-muted-foreground"}`}>{d}</div>
            <div className={`text-[9px] font-black ${i === 2 ? "text-primary-foreground" : "text-foreground"}`}>{10 + i}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1 flex-1 overflow-hidden">
        {hours.map((h, i) => (
          <div key={h} className="flex gap-2 items-start">
            <span className="text-[8px] text-muted-foreground w-8 shrink-0 pt-0.5">{h}</span>
            {i % 3 !== 2 ? (
              <div className={`flex-1 rounded border px-1.5 py-1 ${colors[i % colors.length]}`}>
                <div className="text-[8px] font-semibold text-foreground">{["Ana Lima", "Carla S.", "Julia M.", "Beatriz R.", "Fernanda C.", "Tatiana L."][i]}</div>
                <div className="text-[7px] text-muted-foreground">{["Coloração", "Corte", "Hidratação", "Escova", "Manicure", "Design"][i]}</div>
              </div>
            ) : (
              <div className="flex-1 rounded border border-dashed border-border/50 px-1.5 py-1">
                <div className="text-[7px] text-muted-foreground/50">Disponível</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ClientesMockup() {
  const clients = [
    { name: "Ana Lima", visits: 14, spent: "R$1.240", stars: 5 },
    { name: "Carla Souza", visits: 8, spent: "R$720", stars: 5 },
    { name: "Julia Matos", visits: 22, spent: "R$2.100", stars: 4 },
    { name: "Beatriz Ramos", visits: 5, spent: "R$380", stars: 5 },
    { name: "Fernanda Costa", visits: 11, spent: "R$950", stars: 4 },
  ]
  return (
    <div className="flex flex-col gap-3 p-4 h-full">
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-lg border border-border bg-muted/40 flex items-center gap-1.5 px-2 py-1.5">
          <Search className="h-3 w-3 text-muted-foreground" />
          <div className="h-2 w-20 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="h-7 w-16 rounded-md bg-primary text-[8px] font-bold text-primary-foreground flex items-center justify-center">+ Cliente</div>
      </div>
      <div className="flex flex-col gap-1.5 flex-1 overflow-hidden">
        {clients.map((c) => (
          <div key={c.name} className="flex items-center gap-2 rounded-xl border border-border bg-background p-2">
            <div className="h-7 w-7 rounded-full bg-primary/20 shrink-0 flex items-center justify-center">
              <span className="text-[9px] font-black text-primary">{c.name[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[9px] font-semibold text-foreground">{c.name}</div>
              <div className="flex gap-0.5 mt-0.5">
                {Array.from({ length: c.stars }).map((_, i) => (
                  <Star key={i} className="h-2 w-2 fill-amber-400 text-amber-400" />
                ))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[8px] font-bold text-green-600">{c.spent}</div>
              <div className="text-[7px] text-muted-foreground">{c.visits} visitas</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FinanceiroMockup() {
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"]
  const values = [65, 80, 55, 90, 70, 100]
  const maxVal = Math.max(...values)
  return (
    <div className="flex flex-col gap-3 p-4 h-full">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border bg-background p-2.5">
          <div className="text-[8px] text-muted-foreground mb-1">Receita do mês</div>
          <div className="text-sm font-black text-green-600">R$4.280</div>
          <div className="text-[7px] text-green-600 flex items-center gap-0.5">
            <TrendingUp className="h-2 w-2" /> +12% vs mês anterior
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background p-2.5">
          <div className="text-[8px] text-muted-foreground mb-1">Despesas</div>
          <div className="text-sm font-black text-red-500">R$1.150</div>
          <div className="text-[7px] text-muted-foreground">Fixo + variável</div>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-background p-3 flex-1">
        <div className="text-[9px] font-semibold text-foreground mb-3">Receita — últimos 6 meses</div>
        <div className="flex items-end gap-1.5 h-20">
          {values.map((v, i) => (
            <div key={months[i]} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-sm bg-primary/70"
                style={{ height: `${(v / maxVal) * 100}%` }}
              />
              <span className="text-[7px] text-muted-foreground">{months[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Plan card ─────────────────────────────────────────────────────────────────

interface PlanCardProps {
  plan: SubscriptionPlanDto
  popular?: boolean
  onSelect: (plan: SubscriptionPlanDto) => void
}

function PlanCard({ plan, popular, onSelect }: PlanCardProps) {
  const featureList = [
    `${plan.maxEmployees === -1 ? "Funcionários ilimitados" : `Até ${plan.maxEmployees} funcionário${plan.maxEmployees > 1 ? "s" : ""}`}`,
    `${plan.maxClients === -1 ? "Clientes ilimitados" : `Até ${plan.maxClients} clientes`}`,
    "Agendamentos online",
    "Gestão de clientes e serviços",
    ...(plan.hasFinancial ? ["Módulo financeiro"] : []),
    ...(plan.hasReports ? ["Relatórios e métricas"] : []),
    ...(plan.hasAnamnesis ? ["Ficha de anamnese"] : []),
    "App mobile (iOS e Android)",
    "Suporte por e-mail",
  ]

  return (
    <Card className={`relative flex flex-col transition-shadow ${popular ? "border-primary shadow-xl scale-[1.02]" : "border-border hover:shadow-md"}`}>
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="px-4 py-1 text-xs font-bold">Mais Popular</Badge>
        </div>
      )}
      <CardHeader className="pb-4 pt-8">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{plan.name}</p>
        <div className="flex items-end gap-1 mt-2">
          <span className="text-4xl font-black text-foreground">
            {plan.monthlyPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
          <span className="text-muted-foreground mb-1">/mês</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 gap-6">
        <ul className="flex flex-col gap-2.5 flex-1">
          {featureList.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <Button
          className="w-full"
          variant={popular ? "default" : "outline"}
          onClick={() => onSelect(plan)}
        >
          Começar agora
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PrecosPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<SubscriptionPlanDto[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanDto | null>(null)
  const [form, setForm] = useState({ name: "", email: "", salonName: "" })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [screenshotIdx, setScreenshotIdx] = useState(0)

  useEffect(() => {
    if (getAuthToken()) router.replace("/dashboard")
  }, [router])

  useState(() => {
    apiCall<SubscriptionPlanDto[]>(API_CONFIG.ENDPOINTS.SUBSCRIPTION_PLANS)
      .then((res) => { if (!res.hasError && res.data) setPlans(res.data) })
      .finally(() => setLoadingPlans(false))
  })

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
      const res = await apiCall<CheckoutResultDto>(API_CONFIG.ENDPOINTS.SUBSCRIPTION_CHECKOUT, {
        method: "POST",
        body: JSON.stringify({ planId: selectedPlan.id, ...form }),
      })
      if (res.hasError || !res.data) {
        setError(res.message ?? "Erro ao iniciar checkout.")
        return
      }
      window.location.href = res.data.checkoutUrl
    } catch {
      setError("Erro inesperado. Tente novamente.")
    } finally {
      setSubmitting(false)
    }
  }

  const prevScreen = () => setScreenshotIdx((i) => (i - 1 + SCREENSHOTS.length) % SCREENSHOTS.length)
  const nextScreen = () => setScreenshotIdx((i) => (i + 1) % SCREENSHOTS.length)

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Scissors className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-black text-lg tracking-tight">Voro Salon</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/sign-in">
              <Button variant="outline" size="sm">Entrar</Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">
        <Badge variant="secondary" className="mb-4">Sistema de Gestão para Salões</Badge>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tighter text-balance leading-tight mb-6">
          Gerencie seu salão com{" "}
          <span className="text-primary">inteligência</span>
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 text-balance">
          Agendamentos, clientes, serviços, financeiro e muito mais em uma única plataforma. Simples, rápido e acessível.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button size="lg" asChild>
            <a href="#precos">
              Ver planos <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/admin/sign-in">Já tenho conta</Link>
          </Button>
        </div>
      </section>

      {/* ── Product preview ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">Veja o sistema em ação</h2>
          <p className="text-muted-foreground">Simples de usar, poderoso no dia a dia</p>
        </div>

        {/* Tab buttons */}
        <div className="flex justify-center gap-2 mb-6 flex-wrap">
          {SCREENSHOTS.map((s, i) => (
            <button
              key={s.label}
              onClick={() => setScreenshotIdx(i)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                i === screenshotIdx
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Browser frame mockup */}
        <div className="relative max-w-3xl mx-auto">
          {/* Glow */}
          <div className="absolute inset-0 -z-10 rounded-2xl bg-primary/10 blur-3xl scale-95" />

          <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
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
                  <span className="text-xs text-muted-foreground font-mono">salon-crm.vorolabs.app</span>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-4 w-4 rounded bg-muted" />
                <div className="h-4 w-4 rounded bg-muted" />
              </div>
            </div>

            {/* App sidebar + content */}
            <div className="flex" style={{ height: 340 }}>
              {/* Sidebar */}
              <div className="w-14 sm:w-44 bg-sidebar border-r border-border/60 flex flex-col gap-1 p-2 shrink-0">
                <div className="flex items-center gap-2 px-2 py-2 mb-2">
                  <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center shrink-0">
                    <Scissors className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <span className="hidden sm:block text-xs font-black text-sidebar-foreground truncate">Voro Salon</span>
                </div>
                {[
                  { icon: BarChart3, label: "Dashboard", active: screenshotIdx === 0 },
                  { icon: Calendar, label: "Agendamentos", active: screenshotIdx === 1 },
                  { icon: Users, label: "Clientes", active: screenshotIdx === 2 },
                  { icon: Wallet, label: "Financeiro", active: screenshotIdx === 3 },
                  { icon: Scissors, label: "Serviços", active: false },
                  { icon: ClipboardList, label: "Anamnese", active: false },
                ].map(({ icon: Icon, label, active }) => (
                  <div
                    key={label}
                    className={`flex items-center gap-2 px-2 py-2 rounded-lg cursor-default transition-colors ${
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="hidden sm:block text-xs font-medium truncate">{label}</span>
                  </div>
                ))}
              </div>

              {/* Main content — animated */}
              <div className="flex-1 bg-background overflow-hidden relative">
                <div
                  key={screenshotIdx}
                  className="absolute inset-0 animate-in fade-in slide-in-from-right-4 duration-300"
                >
                  {SCREENSHOTS[screenshotIdx].content}
                </div>
              </div>
            </div>
          </div>

          {/* Caption + arrows */}
          <div className="flex items-center justify-between mt-4 px-1">
            <button
              onClick={prevScreen}
              className="h-8 w-8 rounded-full border border-border bg-background flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">{SCREENSHOTS[screenshotIdx].label}</p>
              <p className="text-xs text-muted-foreground">{SCREENSHOTS[screenshotIdx].description}</p>
            </div>
            <button
              onClick={nextScreen}
              className="h-8 w-8 rounded-full border border-border bg-background flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Dot indicators */}
          <div className="flex justify-center gap-1.5 mt-3">
            {SCREENSHOTS.map((_, i) => (
              <button
                key={i}
                onClick={() => setScreenshotIdx(i)}
                className={`rounded-full transition-all ${
                  i === screenshotIdx ? "w-5 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section className="bg-muted/30 border-y border-border/60 py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-black text-center mb-10 tracking-tight">Tudo que seu salão precisa</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-background border border-border/60 text-center">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-semibold">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="precos" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">Planos simples e transparentes</h2>
          <p className="text-muted-foreground text-lg">Sem taxa de adesão. Cancele quando quiser.</p>
        </div>

        {loadingPlans ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {plans.map((plan, i) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                popular={i === 1}
                onSelect={setSelectedPlan}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── FAQ ── */}
      <section className="bg-muted/30 border-y border-border/60 py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-black text-center mb-8 tracking-tight">Perguntas frequentes</h2>
          <div className="flex flex-col gap-2">
            {FAQ.map((item, i) => (
              <div key={i} className="border border-border/60 rounded-xl bg-background overflow-hidden">
                <button
                  className="w-full text-left px-5 py-4 font-semibold text-sm flex items-center justify-between gap-2"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  {item.q}
                  <span className="text-muted-foreground shrink-0">{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-muted-foreground">{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
            <Scissors className="h-3 w-3 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground">Voro Salon CRM</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
        <div className="flex gap-4">
          <Link href="/admin/sign-in" className="hover:text-foreground transition-colors">Entrar</Link>
          <a href="mailto:contato@vorolabs.app" className="hover:text-foreground transition-colors">Contato</a>
        </div>
      </footer>

      {/* ── Checkout Dialog ── */}
      <Dialog open={!!selectedPlan} onOpenChange={(o) => { if (!o) { setSelectedPlan(null); setTermsAccepted(false); setError(null) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assinar plano {selectedPlan?.name}</DialogTitle>
            <DialogDescription>
              {selectedPlan?.monthlyPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês — você será redirecionado ao MercadoPago.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label>Seu nome</Label>
              <Input
                placeholder="João Silva"
                value={form.name}
                onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>E-mail</Label>
              <Input
                type="email"
                placeholder="joao@meusalao.com"
                value={form.email}
                onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Nome do salão</Label>
              <Input
                placeholder="Salão Beleza Total"
                value={form.salonName}
                onChange={(e) => setForm(p => ({ ...p, salonName: e.target.value }))}
              />
            </div>

            <div className="flex items-start gap-2.5 pt-1">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(v) => setTermsAccepted(!!v)}
              />
              <label htmlFor="terms" className="text-sm text-muted-foreground leading-snug cursor-pointer select-none">
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

            {error && <p className="text-sm text-destructive font-medium">{error}</p>}

            <Button onClick={handleCheckout} disabled={submitting || !termsAccepted} className="w-full mt-1">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ir para pagamento
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Terms Dialog ── */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-2xl flex flex-col">
          <DialogHeader>
            <DialogTitle>Termos de Uso — Voro Salon CRM</DialogTitle>
            <DialogDescription>Última atualização: março de 2025</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[55vh] pr-2 mt-2">
            <div className="text-sm text-muted-foreground space-y-5 leading-relaxed">
              <section>
                <h3 className="font-semibold text-foreground mb-1">1. Aceitação dos Termos</h3>
                <p>Ao assinar um plano e utilizar o Voro Salon CRM, você concorda com estes Termos de Uso. Caso não concorde com qualquer disposição, não utilize o serviço.</p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-1">2. Descrição do Serviço</h3>
                <p>O Voro Salon CRM é uma plataforma SaaS de gestão para salões de beleza, oferecendo funcionalidades de agendamento, cadastro de clientes, controle de serviços, gestão financeira e relatórios, conforme o plano contratado.</p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-1">3. Cadastro e Conta</h3>
                <p>Você é responsável por manter a confidencialidade de suas credenciais de acesso. Compromete-se a fornecer informações verdadeiras, precisas e atualizadas no momento do cadastro. A Vorolabs reserva-se o direito de suspender contas com informações falsas.</p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-1">4. Pagamento e Assinatura</h3>
                <p>O pagamento é realizado mensalmente de forma recorrente via MercadoPago. Os valores podem ser atualizados mediante aviso prévio de 30 dias. O não pagamento pode resultar na suspensão do acesso à plataforma.</p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-1">5. Cancelamento</h3>
                <p>Você pode cancelar sua assinatura a qualquer momento sem multa. O acesso permanece ativo até o fim do período já pago. Não há reembolso proporcional de períodos não utilizados.</p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-1">6. Propriedade dos Dados</h3>
                <p>Todos os dados inseridos na plataforma (clientes, agendamentos, financeiro) pertencem a você. A Vorolabs não compartilha nem comercializa seus dados com terceiros. Em caso de cancelamento, você pode solicitar a exportação dos seus dados em até 30 dias após o encerramento.</p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-1">7. Privacidade</h3>
                <p>O tratamento de dados pessoais segue a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018). Ao utilizar o serviço, você consente com a coleta e uso dos dados necessários para a prestação do serviço conforme nossa Política de Privacidade.</p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-1">8. Uso Permitido</h3>
                <p>O serviço deve ser utilizado exclusivamente para fins legais e relacionados à gestão do seu negócio. É proibido utilizar a plataforma para atividades ilícitas, spam, engenharia reversa ou qualquer ação que prejudique outros usuários ou a infraestrutura do serviço.</p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-1">9. Disponibilidade</h3>
                <p>A Vorolabs envidará melhores esforços para manter o serviço disponível 24/7, mas não garante disponibilidade ininterrupta. Manutenções programadas serão comunicadas com antecedência sempre que possível.</p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-1">10. Limitação de Responsabilidade</h3>
                <p>A Vorolabs não se responsabiliza por perdas indiretas, lucros cessantes ou danos decorrentes do uso ou impossibilidade de uso do serviço. Nossa responsabilidade total está limitada ao valor pago nos últimos 3 meses de assinatura.</p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-1">11. Alterações nos Termos</h3>
                <p>Estes termos podem ser atualizados a qualquer momento. Você será notificado por e-mail com 15 dias de antecedência. O uso continuado após a vigência das alterações implica aceitação.</p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-1">12. Contato</h3>
                <p>Dúvidas sobre estes termos podem ser enviadas para <a href="mailto:contato@vorolabs.app" className="text-primary hover:underline">contato@vorolabs.app</a>.</p>
              </section>
            </div>
          </div>
          <div className="pt-4 border-t border-border mt-2">
            <Button className="w-full" onClick={() => { setShowTerms(false); setTermsAccepted(true) }}>
              Li e aceito os termos
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
