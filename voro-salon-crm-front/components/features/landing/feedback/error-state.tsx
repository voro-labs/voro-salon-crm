"use client"

import Link from "next/link"
import { XCircle } from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { FeedbackLayout } from "./feedback-layout"
import { containerVariants, itemVariants, iconVariants } from "./feedback-variants"

interface ErrorStateProps {
  errorMsg: string | null
}

export function ErrorState({ errorMsg }: ErrorStateProps) {
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
