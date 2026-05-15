"use client"

import { Loader2 } from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import { FeedbackLayout } from "./feedback-layout"
import { containerVariants, itemVariants, iconVariants } from "./feedback-variants"

export function LoadingState() {
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
          <motion.div variants={itemVariants} className="mt-8 flex justify-center gap-1.5">
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
