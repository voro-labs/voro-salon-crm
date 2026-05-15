"use client"

import { useRef, useEffect } from "react"
import { useInView, useReducedMotion } from "framer-motion"

interface CountUpProps {
  target: number
  prefix?: string
  suffix?: string
}

export function CountUp({ target, prefix = "", suffix = "" }: CountUpProps) {
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
