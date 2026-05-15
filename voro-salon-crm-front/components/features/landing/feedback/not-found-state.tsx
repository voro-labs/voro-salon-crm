"use client"

import Link from "next/link"
import { SearchX } from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { FeedbackLayout } from "./feedback-layout"
import { containerVariants, itemVariants, iconVariants } from "./feedback-variants"

export function NotFoundState() {
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
