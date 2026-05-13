"use client"

import Link from "next/link"
import { Clock } from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { FeedbackLayout, FooterBrand } from "./feedback-layout"
import { containerVariants, itemVariants, iconVariants } from "./feedback-variants"

export function TrialState() {
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
