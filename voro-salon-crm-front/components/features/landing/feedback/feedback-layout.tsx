"use client"

import { Scissors } from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import { itemVariants } from "./feedback-variants"

export function FeedbackLayout({ children }: { children: React.ReactNode }) {
  const shouldReduce = useReducedMotion()
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
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

export function FooterBrand() {
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
