"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle2, Scissors, BarChart3, Users, Calendar, ClipboardList, Wallet, Zap, ArrowRight, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { API_CONFIG, apiCall } from "@/lib/api"
import type { SubscriptionPlanDto, CheckoutResultDto } from "@/types/subscription.interface"

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
    <Card className={`relative flex flex-col ${popular ? "border-primary shadow-lg scale-[1.02]" : "border-border"}`}>
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

export default function PrecosPage() {
  const [plans, setPlans] = useState<SubscriptionPlanDto[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanDto | null>(null)
  const [form, setForm] = useState({ name: "", email: "", salonName: "" })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  // Busca os planos da API ao montar
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
          <Link href="/admin/sign-in">
            <Button variant="outline" size="sm">Entrar</Button>
          </Link>
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
          <a href="mailto:voro@vorolabs.app" className="hover:text-foreground transition-colors">Contato</a>
        </div>
      </footer>

      {/* ── Checkout Dialog ── */}
      <Dialog open={!!selectedPlan} onOpenChange={(o) => { if (!o) setSelectedPlan(null) }}>
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

            {error && <p className="text-sm text-destructive font-medium">{error}</p>}

            <Button onClick={handleCheckout} disabled={submitting} className="w-full mt-1">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ir para pagamento
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
