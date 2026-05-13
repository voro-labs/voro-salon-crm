"use client"

import type React from "react"
import { motion, useReducedMotion } from "framer-motion"

interface SectionProps {
  children: React.ReactNode
  className?: string
  delay?: number
}

export function Section({ children, className, delay = 0 }: SectionProps) {
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
