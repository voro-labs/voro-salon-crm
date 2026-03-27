"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, Scissors, Loader2, XCircle, SearchX, Clock } from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { API_CONFIG, apiCall } from "@/lib/api"

type Status = "loading" | "success" | "trial" | "error" | "not_found"

// ── Shared animation variants ────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
}

const iconVariants = {
  hidden: { opacity: 0, scale: 0.5, rotate: -15 },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 20, delay: 0.05 },
  },
}

// ── Page wrapper ─────────────────────────────────────────────────────────────

function FeedbackLayout({ children }: { children: React.ReactNode }) {
  const shouldReduce = useReducedMotion()
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background decorative elements */}
      {!shouldReduce && (
        <>
          <motion.div
            className="pointer-events-none absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl"
            animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="pointer-events-none absolute bottom-1/4 -right-32 w-80 h-80 rounded-full bg-primary/4 blur-3xl"
            animate={{ x: [0, -18, 0], y: [0, 12, 0] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          />
        </>
      )}
      <div className="max-w-md w-full text-center relative z-10">{children}</div>
    </div>
  )
}

// ── Footer brand ─────────────────────────────────────────────────────────────

function FooterBrand() {
  return (
    <motion.div
      variants={itemVariants}
      className="flex items-center justify-center gap-2 mt-10 text-xs text-muted-foreground"
    >
      <div className="h-5 w-5 rounded bg-primary flex items-center justify-center">
        <Scissors className="h-3 w-3 text-primary-foreground" />
      </div>
      Voro Salon CRM © {new Date().getFullYear()}
    </motion.div>
  )
}

// ── States ────────────────────────────────────────────────────────────────────

function TrialState() {
  const shouldReduce = useReducedMotion()
  return (
    <FeedbackLayout>
      <motion.div
        variants={shouldReduce ? {} : containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={shouldReduce ? {} : iconVariants} className="mx-auto mb-6 w-fit">
          <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center relative">
            <Clock className="h-10 w-10 text-primary" />
            {!shouldReduce && (
              <motion.div
                className="absolute inset-0 rounded-3xl border-2 border-primary/30"
                animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
          </div>
        </motion.div>

        <motion.h1
          variants={shouldReduce ? {} : itemVariants}
          className="text-3xl font-black tracking-tight mb-3"
        >
          Trial ativado!
        </motion.h1>

        <motion.p
          variants={shouldReduce ? {} : itemVariants}
          className="text-muted-foreground text-base mb-2"
        >
          Sua conta foi criada e o período de trial foi iniciado.
        </motion.p>

        <motion.p
          variants={shouldReduce ? {} : itemVariants}
          className="text-muted-foreground text-sm mb-8"
        >
          Você receberá um e-mail com suas credenciais de acesso. Use o sistema gratuitamente durante
          o trial — ao final, assine um plano para continuar.
        </motion.p>

        <motion.div
          variants={shouldReduce ? {} : itemVariants}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <motion.div
            whileHover={shouldReduce ? {} : { scale: 1.04, y: -2 }}
            whileTap={shouldReduce ? {} : { scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <Button asChild>
              <Link href="/admin/sign-in">Acessar minha conta</Link>
            </Button>
          </motion.div>
          <motion.div
            whileHover={shouldReduce ? {} : { scale: 1.03 }}
            whileTap={shouldReduce ? {} : { scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <Button variant="outline" asChild>
              <Link href="/prices">Ver planos</Link>
            </Button>
          </motion.div>
        </motion.div>

        <FooterBrand />
      </motion.div>
    </FeedbackLayout>
  )
}

function NotFoundState() {
  const shouldReduce = useReducedMotion()
  return (
    <FeedbackLayout>
      <motion.div
        variants={shouldReduce ? {} : containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={shouldReduce ? {} : iconVariants} className="mx-auto mb-6 w-fit">
          <div className="h-20 w-20 rounded-3xl bg-muted flex items-center justify-center">
            <SearchX className="h-10 w-10 text-muted-foreground" />
          </div>
        </motion.div>

        <motion.h1
          variants={shouldReduce ? {} : itemVariants}
          className="text-2xl font-black tracking-tight mb-3"
        >
          Assinatura não encontrada
        </motion.h1>

        <motion.p
          variants={shouldReduce ? {} : itemVariants}
          className="text-muted-foreground text-sm mb-8"
        >
          Não identificamos uma assinatura associada a este link. Se você acabou de assinar, aguarde
          alguns instantes e recarregue a página, ou entre em contato conosco:{" "}
          <a href="mailto:contato@vorolabs.app" className="text-primary hover:underline">
            contato@vorolabs.app
          </a>
        </motion.p>

        <motion.div
          variants={shouldReduce ? {} : itemVariants}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <motion.div
            whileHover={shouldReduce ? {} : { scale: 1.04, y: -2 }}
            whileTap={shouldReduce ? {} : { scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <Button asChild>
              <Link href="/prices">Ver planos</Link>
            </Button>
          </motion.div>
          <motion.div
            whileHover={shouldReduce ? {} : { scale: 1.03 }}
            whileTap={shouldReduce ? {} : { scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <Button variant="outline" asChild>
              <Link href="/admin/sign-in">Já tenho conta</Link>
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </FeedbackLayout>
  )
}

function LoadingState() {
  const shouldReduce = useReducedMotion()
  return (
    <FeedbackLayout>
      <motion.div
        variants={shouldReduce ? {} : containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={shouldReduce ? {} : iconVariants} className="mx-auto mb-6 w-fit">
          <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center">
            <motion.div
              animate={shouldReduce ? {} : { rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="h-10 w-10 text-primary" />
            </motion.div>
          </div>
        </motion.div>

        <motion.h1
          variants={shouldReduce ? {} : itemVariants}
          className="text-2xl font-black tracking-tight mb-3"
        >
          Confirmando sua assinatura...
        </motion.h1>

        <motion.p
          variants={shouldReduce ? {} : itemVariants}
          className="text-muted-foreground text-sm"
        >
          Aguarde um instante enquanto ativamos sua conta.
        </motion.p>

        {!shouldReduce && (
          <motion.div
            variants={itemVariants}
            className="mt-8 flex justify-center gap-1.5"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-primary/40"
                animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </motion.div>
        )}
      </motion.div>
    </FeedbackLayout>
  )
}

function ErrorState({ errorMsg }: { errorMsg: string | null }) {
  const shouldReduce = useReducedMotion()
  return (
    <FeedbackLayout>
      <motion.div
        variants={shouldReduce ? {} : containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={shouldReduce ? {} : iconVariants} className="mx-auto mb-6 w-fit">
          <div className="h-20 w-20 rounded-3xl bg-destructive/10 flex items-center justify-center relative">
            <XCircle className="h-10 w-10 text-destructive" />
            {!shouldReduce && (
              <motion.div
                className="absolute inset-0 rounded-3xl border-2 border-destructive/20"
                animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
          </div>
        </motion.div>

        <motion.h1
          variants={shouldReduce ? {} : itemVariants}
          className="text-2xl font-black tracking-tight mb-3"
        >
          Algo deu errado
        </motion.h1>

        <motion.p
          variants={shouldReduce ? {} : itemVariants}
          className="text-muted-foreground text-sm mb-2"
        >
          Não conseguimos confirmar sua assinatura automaticamente.
        </motion.p>

        {errorMsg && (
          <motion.p
            variants={shouldReduce ? {} : itemVariants}
            className="text-xs text-destructive/80 bg-destructive/5 rounded-lg px-4 py-2 mb-6 font-mono break-all"
          >
            {errorMsg}
          </motion.p>
        )}

        <motion.p
          variants={shouldReduce ? {} : itemVariants}
          className="text-muted-foreground text-sm mb-8"
        >
          Não se preocupe — se o pagamento foi aprovado, nossa equipe ativará sua conta em até 24
          horas. Entre em contato se precisar de ajuda:{" "}
          <a href="mailto:contato@vorolabs.app" className="text-primary hover:underline">
            contato@vorolabs.app
          </a>
        </motion.p>

        <motion.div
          variants={shouldReduce ? {} : itemVariants}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <motion.div
            whileHover={shouldReduce ? {} : { scale: 1.03 }}
            whileTap={shouldReduce ? {} : { scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <Button variant="outline" asChild>
              <Link href="/prices">Voltar aos planos</Link>
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </FeedbackLayout>
  )
}

function SuccessState() {
  const shouldReduce = useReducedMotion()
  return (
    <FeedbackLayout>
      <motion.div
        variants={shouldReduce ? {} : containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={shouldReduce ? {} : iconVariants} className="mx-auto mb-6 w-fit relative">
          <div className="h-20 w-20 rounded-3xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          {!shouldReduce && (
            <>
              <motion.div
                className="absolute inset-0 rounded-3xl border-2 border-green-500/30"
                animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />
              {/* Confetti-like dots */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    background: ["#22c55e", "#84cc16", "#10b981", "#34d399", "#4ade80", "#86efac"][i],
                    top: "50%",
                    left: "50%",
                  }}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                  animate={{
                    x: [0, (Math.cos((i * Math.PI) / 3) * 60)],
                    y: [0, (Math.sin((i * Math.PI) / 3) * 60)],
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 0.8,
                    delay: 0.3 + i * 0.05,
                    ease: "easeOut",
                  }}
                />
              ))}
            </>
          )}
        </motion.div>

        <motion.h1
          variants={shouldReduce ? {} : itemVariants}
          className="text-3xl font-black tracking-tight mb-3"
        >
          Assinatura confirmada!
        </motion.h1>

        <motion.p
          variants={shouldReduce ? {} : itemVariants}
          className="text-muted-foreground text-base mb-2"
        >
          Obrigado por assinar o <strong>Voro Salon CRM</strong>.
        </motion.p>

        <motion.p
          variants={shouldReduce ? {} : itemVariants}
          className="text-muted-foreground text-sm mb-8"
        >
          Você receberá um e-mail com suas credenciais de acesso em breve.
        </motion.p>

        <motion.div
          variants={shouldReduce ? {} : itemVariants}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <motion.div
            whileHover={shouldReduce ? {} : { scale: 1.04, y: -2 }}
            whileTap={shouldReduce ? {} : { scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <Button asChild>
              <Link href="/admin/sign-in">Acessar minha conta</Link>
            </Button>
          </motion.div>
          <motion.div
            whileHover={shouldReduce ? {} : { scale: 1.03 }}
            whileTap={shouldReduce ? {} : { scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <Button variant="outline" asChild>
              <Link href="/prices">Voltar aos planos</Link>
            </Button>
          </motion.div>
        </motion.div>

        <FooterBrand />
      </motion.div>
    </FeedbackLayout>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

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
