"use client"

import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { FeedbackLayout, FooterBrand } from "./feedback-layout"
import { containerVariants, itemVariants, iconVariants } from "./feedback-variants"

export function SuccessState() {
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
                    x: [0, Math.cos((i * Math.PI) / 3) * 60],
                    y: [0, Math.sin((i * Math.PI) / 3) * 60],
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.05, ease: "easeOut" }}
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
