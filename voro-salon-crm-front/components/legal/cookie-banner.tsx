"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Cookie, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const STORAGE_KEY = "vorolabs_cookie_consent"

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      // Pequeno delay para não competir com animações da página
      const t = setTimeout(() => setVisible(true), 1200)
      return () => clearTimeout(t)
    }
  }, [])

  function accept() {
    localStorage.setItem(STORAGE_KEY, "accepted")
    setVisible(false)
  }

  function decline() {
    localStorage.setItem(STORAGE_KEY, "declined")
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="cookie-banner"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          className="fixed bottom-4 left-1/2 z-100 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2"
        >
          <div className="rounded-xl border border-border bg-card shadow-xl shadow-black/10 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Cookie className="h-4 w-4 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground mb-1">
                  Utilizamos cookies
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Usamos cookies essenciais para o funcionamento da plataforma e cookies analíticos
                  para melhorar sua experiência.{" "}
                  <Link
                    href="/cookies"
                    className="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
                  >
                    Saiba mais
                  </Link>
                  .
                </p>
              </div>

              <button
                onClick={decline}
                aria-label="Fechar"
                className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row items-center gap-2 sm:justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={decline}
                className="w-full sm:w-auto text-muted-foreground"
              >
                Recusar não essenciais
              </Button>
              <Button
                size="sm"
                onClick={accept}
                className="w-full sm:w-auto"
              >
                Aceitar todos
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
