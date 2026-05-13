"use client"

import Link from "next/link"
import { Scissors } from "lucide-react"
import { ThemeToggle } from "@/components/ui/custom/theme-toggle"

export function LegalHeader() {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link
          href="/prices"
          className="flex items-center gap-2 text-foreground font-semibold hover:text-primary transition-colors"
        >
          <Scissors className="h-5 w-5 text-primary" />
          <span>Voro Salon</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/prices"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Ver planos
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
