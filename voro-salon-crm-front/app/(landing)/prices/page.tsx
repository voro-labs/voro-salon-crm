"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useInView,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
} from "framer-motion"
import {
  CheckCircle2, Scissors, BarChart3, Users, Calendar, ClipboardList,
  Wallet, Zap, ArrowRight, Loader2, ChevronLeft, ChevronRight,
  Bell, Search, TrendingUp, Clock, Star, Info, MessageCircle,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { API_CONFIG, apiCall, getAuthToken } from "@/lib/api"
import { getClientBranding, getEstablishmentTypeByHostname } from "@/lib/branding"
import { EstablishmentType } from "@/types/Enums/establishmentType.enum"
import type { SubscriptionPlanDto, CheckoutResultDto, CouponValidationResultDto } from "@/types/subscription.interface"
import { ModuleInfoDialog } from "@/components/ui/custom/module-info-dialog"

// ── Animation variants ────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 28, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
}


const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
}

const staggerFast = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

// ── Utility hooks ─────────────────────────────────────────────────────────────

function useViewportVariants(once = true) {
  const shouldReduce = useReducedMotion()
  return {
    initial: shouldReduce ? "visible" : "hidden",
    whileInView: "visible",
    viewport: { once, margin: "-60px" as const },
  }
}

// ── CountUp ───────────────────────────────────────────────────────────────────

function CountUp({
  target,
  prefix = "",
  suffix = "",
}: {
  target: number
  prefix?: string
  suffix?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-80px" })
  const shouldReduce = useReducedMotion()

  useEffect(() => {
    if (!isInView) return
    const start = Date.now()
    const duration = shouldReduce ? 0 : 2000
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3)
      if (ref.current)
        ref.current.textContent = `${prefix}${Math.round(eased * target).toLocaleString("pt-BR")}${suffix}`
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [isInView, target, prefix, suffix, shouldReduce])

  return (
    <span ref={ref}>
      {prefix}0{suffix}
    </span>
  )
}

// ── Tilt card (for pricing) ───────────────────────────────────────────────────

function TiltCard({
  children,
  className,
  intensity = 8,
}: {
  children: React.ReactNode
  className?: string
  intensity?: number
}) {
  const shouldReduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 300, damping: 30 })
  const springY = useSpring(y, { stiffness: 300, damping: 30 })
  const rotateX = useTransform(springY, [-0.5, 0.5], [intensity, -intensity])
  const rotateY = useTransform(springX, [-0.5, 0.5], [-intensity, intensity])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduce || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    x.set((e.clientX - rect.left) / rect.width - 0.5)
    y.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ── Animated section wrapper ──────────────────────────────────────────────────

function Section({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const shouldReduce = useReducedMotion()
  return (
    <motion.div
      initial={shouldReduce ? "visible" : "hidden"}
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={{
        hidden: { opacity: 0, y: 32 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ── Static data ──────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    name: "Camila Ferreira",
    meta: "Salão com 3 profissionais · São Paulo/SP",
    avatar: "CF",
    result: "De 5 faltas para 1 por semana no 1º mês",
    text: "Antes eu perdia umas 3 a 5 clientes por semana que simplesmente sumiam. Com o Voro, o lembrete automático no WhatsApp resolveu isso. Faturei R$ 1.200 a mais só no primeiro mês.",
    stars: 5,
  },
  {
    name: "Juliana Matos",
    meta: "Salão com 4 profissionais · Campinas/SP",
    avatar: "JM",
    result: "5h economizadas por semana em ligações",
    text: "Eu ficava no celular marcando horário a semana toda. Hoje o sistema faz tudo sozinho — o cliente agenda pelo link e já recebe confirmação. Sobrou tempo pra atender mais.",
    stars: 5,
  },
  {
    name: "Bruna Oliveira",
    meta: "Autônoma · Curitiba/PR",
    avatar: "BO",
    result: "+R$ 2.400/mês depois de 60 dias",
    text: "O financeiro integrado me mostrou que eu estava cobrando barato e perdia dinheiro com faltas. Reajustei os preços, reduzi os no-shows e o lucro subiu muito mais do que esperava.",
    stars: 5,
  },
  {
    name: "Renata Costa",
    meta: "Salão com 2 profissionais · Belo Horizonte/MG",
    avatar: "RC",
    result: "Reduziu no-show em 70% em 3 semanas",
    text: "Tentei outros sistemas mas eram complicados demais. O Voro configurei em uma tarde e já no primeiro mês as clientes pararam de furar. Indico pra todo mundo.",
    stars: 5,
  },
  {
    name: "Fernanda Lima",
    meta: "Salão com 6 profissionais · Fortaleza/CE",
    avatar: "FL",
    result: "Agenda cheia sem precisar ligar",
    text: "A gente tinha uma pessoa quase que dedicada a confirmar horário por telefone. Agora o WhatsApp automático do Voro faz isso e essa pessoa passou a atender clientes.",
    stars: 4,
  },
  {
    name: "Ana Paula Souza",
    meta: "Autônoma · Porto Alegre/RS",
    avatar: "AP",
    result: "+R$ 800/mês só recuperando faltas",
    text: "No começo duvidei, mas testei os 14 dias grátis e as faltas caíram logo. Calculei que recupero em média R$ 800 por mês que antes simplesmente sumia da minha agenda.",
    stars: 5,
  },
]

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

function buildFaq(productName: string, establishmentLabel: string) {
  return [
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
      q: `Os dados do meu ${establishmentLabel} ficam seguros?`,
      a: "Sim. Todos os dados são criptografados e armazenados com segurança. Somente você tem acesso.",
    },
    {
      q: "Preciso instalar algum programa?",
      a: `Não. O ${productName} funciona direto no navegador e também tem aplicativo para iOS e Android.`,
    },
  ]
}

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

// ── Mockup components ─────────────────────────────────────────────────────────

function DashboardMockup() {
  const weekBars = [42, 68, 55, 80, 91, 73, 60]
  const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"]
  const maxBar = Math.max(...weekBars)
  return (
    <div className="flex flex-col gap-2.5 p-4 h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
            <Scissors className="h-3 w-3 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <div className="h-2.5 w-20 rounded-full bg-foreground/80" />
            <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30 mt-0.5" />
          </div>
        </div>
        <div className="flex gap-1.5">
          <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center relative">
            <Bell className="h-3 w-3 text-muted-foreground" />
            <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500" />
          </div>
          <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-[7px] font-black text-primary">JS</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: "Hoje", value: "12", sub: "agendamentos", color: "bg-primary/10 text-primary", trend: "+2" },
          { label: "Receita", value: "R$840", sub: "este mês", color: "bg-green-500/10 text-green-600", trend: "+12%" },
          { label: "Clientes", value: "248", sub: "cadastrados", color: "bg-blue-500/10 text-blue-600", trend: "+8" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-background p-2 flex flex-col gap-0.5">
            <span className="text-[8px] text-muted-foreground font-medium">{c.label}</span>
            <span className={`text-[11px] font-black rounded px-1 w-fit ${c.color}`}>{c.value}</span>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-[7px] text-muted-foreground">{c.sub}</span>
              <span className="text-[7px] text-green-600 font-semibold">{c.trend}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-background p-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[8px] font-semibold text-foreground">Semana — atendimentos</span>
          <TrendingUp className="h-2.5 w-2.5 text-green-600" />
        </div>
        <div className="flex items-end gap-1 h-10">
          {weekBars.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className={`w-full rounded-t-[2px] ${i === 4 ? "bg-primary" : "bg-primary/30"}`}
                style={{ height: `${(v / maxBar) * 100}%` }}
              />
              <span className={`text-[6px] ${i === 4 ? "text-primary font-bold" : "text-muted-foreground"}`}>{weekDays[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background p-2 flex-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[8px] font-semibold text-foreground">Próximos agendamentos</span>
          <span className="text-[7px] text-primary font-semibold">Ver todos</span>
        </div>
        {[
          { name: "Ana Lima", service: "Coloração", time: "09:00", status: "confirmado" },
          { name: "Carla Souza", service: "Corte + Escova", time: "10:30", status: "pendente" },
          { name: "Julia Matos", service: "Hidratação", time: "13:00", status: "confirmado" },
        ].map((a) => (
          <div key={a.name} className="flex items-center gap-1.5 py-1 border-b border-border/40 last:border-0">
            <div className="h-5 w-5 rounded-full bg-primary/20 shrink-0 flex items-center justify-center">
              <span className="text-[7px] font-black text-primary">{a.name[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[8px] font-semibold text-foreground truncate">{a.name}</div>
              <div className="text-[7px] text-muted-foreground truncate">{a.service}</div>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-0.5">
                <Clock className="h-2 w-2 text-muted-foreground" />
                <span className="text-[7px] text-muted-foreground">{a.time}</span>
              </div>
              <span className={`text-[6px] font-semibold rounded px-1 ${a.status === "confirmado" ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600"}`}>
                {a.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AgendamentosMockup() {
  const hours = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00"]
  const colors = [
    "bg-primary/20 border-primary/40",
    "bg-blue-500/20 border-blue-500/40",
    "bg-green-500/20 border-green-500/40",
    "bg-amber-500/20 border-amber-500/40",
  ]
  return (
    <div className="flex flex-col gap-3 p-4 h-full">
      <div className="flex items-center justify-between">
        <div className="h-3 w-28 rounded-full bg-foreground/80" />
        <div className="flex gap-1.5">
          <div className="h-6 w-16 rounded-md bg-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center">
            + Novo
          </div>
        </div>
      </div>
      <div className="flex gap-1 overflow-hidden">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d, i) => (
          <div
            key={d}
            className={`flex-1 rounded-lg p-1 text-center ${i === 2 ? "bg-primary text-primary-foreground" : "bg-muted/50"}`}
          >
            <div
              className={`text-[7px] font-medium ${i === 2 ? "text-primary-foreground" : "text-muted-foreground"}`}
            >
              {d}
            </div>
            <div
              className={`text-[9px] font-black ${i === 2 ? "text-primary-foreground" : "text-foreground"}`}
            >
              {10 + i}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1 flex-1 overflow-hidden">
        {hours.map((h, i) => (
          <div key={h} className="flex gap-2 items-start">
            <span className="text-[8px] text-muted-foreground w-8 shrink-0 pt-0.5">{h}</span>
            {i % 3 !== 2 ? (
              <div className={`flex-1 rounded border px-1.5 py-1 ${colors[i % colors.length]}`}>
                <div className="text-[8px] font-semibold text-foreground">
                  {["Ana Lima", "Carla S.", "Julia M.", "Beatriz R.", "Fernanda C.", "Tatiana L."][i]}
                </div>
                <div className="text-[7px] text-muted-foreground">
                  {["Coloração", "Corte", "Hidratação", "Escova", "Manicure", "Design"][i]}
                </div>
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
        <div className="h-7 w-16 rounded-md bg-primary text-[8px] font-bold text-primary-foreground flex items-center justify-center">
          + Cliente
        </div>
      </div>
      <div className="flex flex-col gap-1.5 flex-1 overflow-hidden">
        {clients.map((c) => (
          <div
            key={c.name}
            className="flex items-center gap-2 rounded-xl border border-border bg-background p-2"
          >
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
  const receitas = [3200, 3850, 3100, 4400, 3700, 4280]
  const despesas = [980, 1050, 920, 1200, 1080, 1150]
  const maxVal = Math.max(...receitas)
  const lucro = receitas[5] - despesas[5]
  const transactions = [
    { desc: "Coloração — Ana Lima", tipo: "entrada", valor: "R$180", hora: "09:00" },
    { desc: "Corte — Carla Souza", tipo: "entrada", valor: "R$85", hora: "10:30" },
    { desc: "Produto Keratin Pro", tipo: "saida", valor: "R$220", hora: "11:00" },
    { desc: "Hidratação — Julia M.", tipo: "entrada", valor: "R$120", hora: "13:00" },
  ]
  return (
    <div className="flex flex-col gap-2 p-4 h-full">
      <div className="grid grid-cols-3 gap-1.5">
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-2">
          <div className="text-[7px] text-muted-foreground mb-0.5">Receita</div>
          <div className="text-[11px] font-black text-green-600">R$4.280</div>
          <div className="text-[6px] text-green-600 flex items-center gap-0.5 mt-0.5">
            <TrendingUp className="h-1.5 w-1.5" /> +12%
          </div>
        </div>
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-2">
          <div className="text-[7px] text-muted-foreground mb-0.5">Despesas</div>
          <div className="text-[11px] font-black text-red-500">R$1.150</div>
          <div className="text-[6px] text-muted-foreground mt-0.5">fixo + variável</div>
        </div>
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-2">
          <div className="text-[7px] text-muted-foreground mb-0.5">Lucro</div>
          <div className="text-[11px] font-black text-primary">R${lucro.toLocaleString("pt-BR")}</div>
          <div className="text-[6px] text-primary mt-0.5 font-semibold">este mês</div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background p-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[8px] font-semibold text-foreground">Receita x Despesa — 6 meses</span>
        </div>
        <div className="flex items-end gap-1 h-12">
          {receitas.map((v, i) => (
            <div key={months[i]} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full flex flex-col items-center gap-px">
                <div className="w-full rounded-t-[2px] bg-primary/60" style={{ height: `${(v / maxVal) * 36}px` }} />
                <div className="w-full rounded-b-[1px] bg-red-400/50" style={{ height: `${(despesas[i] / maxVal) * 36}px` }} />
              </div>
              <span className={`text-[6px] ${i === 5 ? "text-primary font-bold" : "text-muted-foreground"}`}>{months[i]}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-1">
          <div className="flex items-center gap-0.5"><div className="h-1.5 w-2 rounded-sm bg-primary/60" /><span className="text-[6px] text-muted-foreground">Receita</span></div>
          <div className="flex items-center gap-0.5"><div className="h-1.5 w-2 rounded-sm bg-red-400/50" /><span className="text-[6px] text-muted-foreground">Despesa</span></div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background p-2 flex-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[8px] font-semibold text-foreground">Lançamentos de hoje</span>
          <span className="text-[7px] text-primary font-semibold">+ Novo</span>
        </div>
        <div className="flex flex-col gap-1">
          {transactions.map((t) => (
            <div key={t.desc} className="flex items-center gap-1.5 py-0.5 border-b border-border/40 last:border-0">
              <div className={`h-4 w-4 rounded-full shrink-0 flex items-center justify-center ${t.tipo === "entrada" ? "bg-green-500/15" : "bg-red-500/15"}`}>
                <span className={`text-[8px] font-black ${t.tipo === "entrada" ? "text-green-600" : "text-red-500"}`}>
                  {t.tipo === "entrada" ? "+" : "−"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[7px] font-medium text-foreground truncate">{t.desc}</div>
                <div className="text-[6px] text-muted-foreground">{t.hora}</div>
              </div>
              <span className={`text-[8px] font-bold shrink-0 ${t.tipo === "entrada" ? "text-green-600" : "text-red-500"}`}>{t.valor}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ServicosMockup() {
  const services = [
    { name: "Coloração completa", duration: "120 min", price: "R$180", category: "Coloração", active: true },
    { name: "Corte feminino", duration: "45 min", price: "R$85", category: "Corte", active: true },
    { name: "Escova modeladora", duration: "60 min", price: "R$70", category: "Finalização", active: true },
    { name: "Hidratação profunda", duration: "90 min", price: "R$120", category: "Tratamento", active: true },
    { name: "Manicure + Pedicure", duration: "75 min", price: "R$65", category: "Unhas", active: false },
  ]
  const categories = ["Todos", "Corte", "Coloração", "Tratamento"]
  return (
    <div className="flex flex-col gap-2.5 p-4 h-full">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-foreground">Catálogo de Serviços</span>
          <span className="text-[7px] text-muted-foreground">5 serviços cadastrados</span>
        </div>
        <div className="h-6 w-16 rounded-md bg-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center">
          + Serviço
        </div>
      </div>

      <div className="flex gap-1 overflow-hidden">
        {categories.map((cat, i) => (
          <div
            key={cat}
            className={`rounded-full px-2 py-0.5 text-[7px] font-semibold whitespace-nowrap ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            {cat}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5 flex-1 overflow-hidden">
        {services.map((s) => (
          <div key={s.name} className={`flex items-center gap-2 rounded-xl border p-2 ${s.active ? "border-border bg-background" : "border-border/40 bg-muted/20"}`}>
            <div className="h-7 w-7 rounded-lg bg-primary/10 shrink-0 flex items-center justify-center">
              <Scissors className="h-3 w-3 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-[8px] font-semibold truncate ${s.active ? "text-foreground" : "text-muted-foreground"}`}>{s.name}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[6px] text-muted-foreground bg-muted rounded px-1 py-px">{s.category}</span>
                <span className="text-[6px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="h-1.5 w-1.5" />{s.duration}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[9px] font-black text-primary">{s.price}</div>
              <div className={`text-[6px] font-semibold mt-0.5 ${s.active ? "text-green-600" : "text-muted-foreground"}`}>
                {s.active ? "ativo" : "inativo"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RelatoriosMockup() {
  const topServices = [
    { name: "Coloração", pct: 100, count: 38, receita: "R$6.840" },
    { name: "Corte feminino", pct: 72, count: 27, receita: "R$2.295" },
    { name: "Escova", pct: 55, count: 21, receita: "R$1.470" },
    { name: "Hidratação", pct: 40, count: 15, receita: "R$1.800" },
  ]
  return (
    <div className="flex flex-col gap-2.5 p-4 h-full">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-foreground">Relatórios</span>
          <span className="text-[7px] text-muted-foreground">Junho 2025</span>
        </div>
        <div className="flex gap-1">
          {["Mês", "Trim.", "Ano"].map((p, i) => (
            <div key={p} className={`rounded-full px-1.5 py-0.5 text-[7px] font-semibold ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{p}</div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-xl border border-border bg-background p-2">
          <div className="text-[7px] text-muted-foreground">Atendimentos</div>
          <div className="text-[13px] font-black text-foreground">101</div>
          <div className="text-[6px] text-green-600 flex items-center gap-0.5 font-semibold"><TrendingUp className="h-1.5 w-1.5" />+18% vs jun/24</div>
        </div>
        <div className="rounded-xl border border-border bg-background p-2">
          <div className="text-[7px] text-muted-foreground">Ticket médio</div>
          <div className="text-[13px] font-black text-foreground">R$128</div>
          <div className="text-[6px] text-green-600 flex items-center gap-0.5 font-semibold"><TrendingUp className="h-1.5 w-1.5" />+R$14 vs mai</div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background p-2 flex-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[8px] font-semibold text-foreground">Serviços mais realizados</span>
          <BarChart3 className="h-2.5 w-2.5 text-primary" />
        </div>
        <div className="flex flex-col gap-2">
          {topServices.map((s) => (
            <div key={s.name} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[7px] font-medium text-foreground">{s.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[6px] text-muted-foreground">{s.count}x</span>
                  <span className="text-[7px] font-bold text-green-600">{s.receita}</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary/60" style={{ width: `${s.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background p-2">
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-semibold text-foreground">Taxa de retorno</span>
          <span className="text-[8px] font-black text-primary">78%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
          <div className="h-full rounded-full bg-primary" style={{ width: "78%" }} />
        </div>
        <span className="text-[6px] text-muted-foreground mt-0.5 block">Clientes que retornaram em 60 dias</span>
      </div>
    </div>
  )
}

function WhatsAppMockup() {
  return (
    <div className="flex flex-col gap-2 p-3 h-full">
      {/* WhatsApp header */}
      <div className="flex items-center gap-2 rounded-xl bg-green-600 px-3 py-2">
        <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <Scissors className="h-3.5 w-3.5 text-white" />
        </div>
        <div>
          <div className="text-[9px] font-bold text-white">Salão da Ana</div>
          <div className="text-[7px] text-green-100">Lembrete automático</div>
        </div>
        <div className="ml-auto h-4 w-4 rounded-full bg-white/10 flex items-center justify-center">
          <MessageCircle className="h-2.5 w-2.5 text-white" />
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex flex-col gap-2 flex-1 overflow-hidden">
        {/* Bot message — confirmação */}
        <div className="flex gap-1.5 max-w-[88%]">
          <div className="rounded-xl rounded-tl-none bg-muted/80 p-2 shadow-sm">
            <div className="text-[7.5px] text-foreground leading-relaxed">
              Olá, Camila! 👋 Confirmação de horário:<br />
              📅 Terça, 24 jun · 14h00<br />
              💇 Coloração + Hidratação<br />
              💰 R$ 300,00<br /><br />
              Você confirma presença?
            </div>
            <div className="text-[6px] text-muted-foreground text-right mt-0.5">13:47 ✓✓</div>
          </div>
        </div>

        {/* Client reply */}
        <div className="flex justify-end">
          <div className="rounded-xl rounded-tr-none bg-green-500 p-2 shadow-sm">
            <div className="text-[9px] text-white font-semibold">Confirmo! ✅</div>
            <div className="text-[6px] text-green-100 text-right mt-0.5">13:52 ✓✓</div>
          </div>
        </div>

        {/* Bot follow-up */}
        <div className="flex gap-1.5 max-w-[80%]">
          <div className="rounded-xl rounded-tl-none bg-muted/80 p-2 shadow-sm">
            <div className="text-[7.5px] text-foreground">
              Perfeito! Te esperamos 🙌<br />Até logo, Camila!
            </div>
            <div className="text-[6px] text-muted-foreground text-right mt-0.5">13:52 ✓✓</div>
          </div>
        </div>

        {/* Lembrete 24h */}
        <div className="mt-auto">
          <div className="text-center text-[6px] text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5 mx-auto w-fit mb-1.5">
            Lembrete automático — 24h antes
          </div>
          <div className="flex gap-1.5 max-w-[88%]">
            <div className="rounded-xl rounded-tl-none bg-muted/80 p-2 shadow-sm">
              <div className="text-[7.5px] text-foreground">
                ⏰ Lembrete: seu horário é amanhã às 14h no Salão da Ana!
              </div>
              <div className="text-[6px] text-muted-foreground text-right mt-0.5">14:00 ✓✓</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats badge */}
      <div className="flex items-center gap-1.5 rounded-xl bg-green-500/10 border border-green-500/20 px-2.5 py-1.5">
        <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
        <span className="text-[7.5px] text-green-700 dark:text-green-400 font-semibold">
          100% automático · você não faz nada
        </span>
      </div>
    </div>
  )
}

function AgendamentoOnlineMockup() {
  return (
    <div className="flex flex-col gap-2.5 p-4 h-full">
      {/* Salon header */}
      <div className="text-center">
        <div className="h-9 w-9 rounded-full bg-primary mx-auto mb-1 flex items-center justify-center">
          <Scissors className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="text-[11px] font-black text-foreground">Salão da Ana</div>
        <div className="text-[7px] text-muted-foreground">Agende seu horário online, 24h por dia</div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-1">
        {["Serviço", "Data", "Confirmar"].map((s, i) => (
          <div key={s} className="flex items-center gap-0.5">
            <div className={`h-4 w-4 rounded-full text-[7px] font-bold flex items-center justify-center ${i === 0 ? "bg-primary text-primary-foreground" : i === 1 ? "bg-primary/25 text-primary" : "bg-muted text-muted-foreground"}`}>
              {i + 1}
            </div>
            <span className={`text-[7px] ${i === 0 ? "text-primary font-semibold" : "text-muted-foreground"}`}>{s}</span>
            {i < 2 && <div className="w-3 h-px bg-border mx-0.5" />}
          </div>
        ))}
      </div>

      {/* Service selection */}
      <div className="flex flex-col gap-1.5 flex-1">
        <div className="text-[8px] font-semibold text-foreground">Escolha o serviço</div>
        {[
          { name: "Coloração completa", time: "120 min", price: "R$ 180", selected: true },
          { name: "Corte feminino", time: "45 min", price: "R$ 85", selected: false },
          { name: "Escova modeladora", time: "60 min", price: "R$ 70", selected: false },
          { name: "Hidratação profunda", time: "90 min", price: "R$ 120", selected: false },
        ].map((s) => (
          <div
            key={s.name}
            className={`flex items-center gap-2 rounded-lg border p-1.5 ${s.selected ? "border-primary bg-primary/5" : "border-border bg-background"}`}
          >
            <div className={`h-3 w-3 rounded-full border-2 shrink-0 ${s.selected ? "border-primary bg-primary" : "border-muted-foreground/30"}`} />
            <div className="flex-1 min-w-0">
              <div className={`text-[8px] font-medium truncate ${s.selected ? "text-foreground" : "text-muted-foreground"}`}>{s.name}</div>
              <div className="text-[6px] text-muted-foreground flex items-center gap-0.5">
                <Clock className="h-1.5 w-1.5" />{s.time}
              </div>
            </div>
            <div className={`text-[8px] font-bold shrink-0 ${s.selected ? "text-primary" : "text-muted-foreground"}`}>{s.price}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div>
        <div className="h-7 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-[9px] font-bold text-primary-foreground">Próximo — Escolher data →</span>
        </div>
        <div className="flex items-center justify-center gap-1 mt-1.5">
          <CheckCircle2 className="h-2.5 w-2.5 text-green-500" />
          <span className="text-[6.5px] text-muted-foreground">Sem login · sem download · 24h disponível</span>
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
  onModuleInfo: (key: string) => void
}

function PlanCard({ plan, popular, onSelect, onModuleInfo }: PlanCardProps) {
  type FeatureItem = { label: string; moduleKey?: string; highlight?: boolean }

  const featureList: FeatureItem[] = [
    {
      label: plan.hasEmployees
        ? plan.maxEmployees === -1
          ? "Funcionários ilimitados"
          : `Até ${plan.maxEmployees} funcionários`
        : "Apenas o proprietário",
    },
    { label: plan.maxClients === -1 ? "Clientes ilimitados" : `Até ${plan.maxClients} clientes` },
    { label: "Agendamentos internos" },
    { label: "Gestão de clientes e serviços" },
    { label: "Notificações de agendamentos" },
    { label: "Mensagem WhatsApp manual" },
    ...(plan.hasFinancial ? [{ label: "Finanças", moduleKey: "financial" }] : []),
    ...(plan.hasReports ? [{ label: "Relatórios", moduleKey: "reports" }] : []),
    ...(plan.hasAnamnesis ? [{ label: "Anamnese", moduleKey: "anamnesis" }] : []),
    ...(plan.hasBooking ? [{ label: "Agendamento Online", moduleKey: "booking" }] : []),
    ...(plan.hasWhatsAppBot
      ? [{ label: "Bot WhatsApp", moduleKey: "whatsappBot", highlight: true }]
      : []),
    { label: "Exportar dados (CSV)" },
    { label: "Autenticação 2FA" },
    { label: "Suporte por e-mail" },
  ]

  return (
    <Card
      className={`relative flex flex-col transition-all duration-300 ${
        popular
          ? "border-primary shadow-2xl shadow-primary/15 scale-[1.02]"
          : "border-border hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
      }`}
    >
      {popular && (
        <motion.div
          className="absolute -top-3 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0, y: -8, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.3 }}
        >
          <Badge className="px-4 py-1 text-xs font-bold shadow-lg shadow-primary/30">
            <Sparkles className="h-3 w-3 mr-1" />
            Mais Popular
          </Badge>
        </motion.div>
      )}
      <CardHeader className="pb-4 pt-8">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{plan.name}</p>
        <div className="flex items-end gap-1 mt-2">
          <span className="text-4xl font-black text-foreground">
            {plan.monthlyPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
          <span className="text-muted-foreground mb-1">/mês</span>
        </div>
        {popular && (
          <p className="text-xs text-muted-foreground -mt-1">
            ≈ R$ {(plan.monthlyPrice / 30).toFixed(2)}/dia
          </p>
        )}
        <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
        {plan.defaultTrialDays > 0 && (
          <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            {plan.defaultTrialDays} dias grátis para testar
          </div>
        )}
      </CardHeader>
      <CardContent className="flex flex-col flex-1 gap-6">
        <ul className="flex flex-col gap-2.5 flex-1">
          {featureList.map((f) =>
            f.highlight ? (
              <li key={f.label} className="bg-primary/10 rounded-md px-2 py-1.5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                  <span className="flex-1">🤙 Lembrete automático via WhatsApp</span>
                  {f.moduleKey && (
                    <button
                      onClick={() => onModuleInfo(f.moduleKey!)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title={`Saiba mais sobre ${f.label}`}
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 ml-6">Reduz no-show em até 40%</p>
              </li>
            ) : (
              <li key={f.label} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                <span className="flex-1">{f.label}</span>
                {f.moduleKey && (
                  <button
                    onClick={() => onModuleInfo(f.moduleKey!)}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title={`Saiba mais sobre ${f.label}`}
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            )
          )}
        </ul>

        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          <Button
            className="w-full"
            variant={popular ? "default" : "outline"}
            onClick={() => onSelect(plan)}
          >
            Começar agora
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      </CardContent>
    </Card>
  )
}

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
    if (getAuthToken()) router.replace("/dashboard")
  }, [router])

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

  // Auto-play entre tabs do product preview
  useEffect(() => {
    if (previewPaused) return
    const interval = setInterval(() => {
      setScreenshotIdx((i) => (i + 1) % SCREENSHOTS.length)
    }, 3500)
    return () => clearInterval(interval)
  }, [previewPaused])

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
      }
      if (couponResult) body.couponCode = couponResult.code

      const res = await apiCall<CheckoutResultDto>(API_CONFIG.ENDPOINTS.SUBSCRIPTION_CHECKOUT, {
        method: "POST",
        body: JSON.stringify(body),
      })
      if (res.hasError || !res.data) {
        setError(res.message ?? "Erro ao iniciar checkout.")
        return
      }
      if (res.data.isTrial) {
        router.push("/prices/feedback?trial=true")
      } else {
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
            <motion.div
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
            </motion.div>
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
              { value: "14 dias", label: "grátis" },
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

            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start"
              variants={stagger}
              initial={shouldReduce ? "visible" : "hidden"}
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
            >
              {plans.map((plan, i) => (
                <motion.div
                  key={plan.id}
                  variants={fadeUp}
                  style={{ perspective: 800 }}
                >
                  <TiltCard intensity={i === 1 ? 4 : 6}>
                    <PlanCard
                      plan={plan}
                      popular={i === 1}
                      onSelect={setSelectedPlan}
                      onModuleInfo={setOpenModuleKey}
                    />
                  </TiltCard>
                </motion.div>
              ))}
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
        onOpenChange={(o) => {
          if (!o) {
            setSelectedPlan(null)
            setTermsAccepted(false)
            setError(null)
            setCouponCode("")
            setCouponResult(null)
            setCouponError(null)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assinar plano {selectedPlan?.name}</DialogTitle>
            <DialogDescription>
              {selectedPlan?.monthlyPrice.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
              /mês
              {trialDays > 0 && (
                <span className="ml-1 text-green-600 dark:text-green-400 font-medium">
                  — {trialDays} dias de trial grátis incluídos
                </span>
              )}
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
                  <SelectItem value={String(EstablishmentType.Salon)}>Salão de beleza</SelectItem>
                  <SelectItem value={String(EstablishmentType.Barber)}>Barbearia</SelectItem>
                  <SelectItem value={String(EstablishmentType.Petshop)}>Petshop</SelectItem>
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
                {trialDays > 0 ? "Iniciar trial grátis" : "Ir para pagamento"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
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
    </div>
  )
}
