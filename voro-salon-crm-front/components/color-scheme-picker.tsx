"use client"

import { useState, useEffect } from "react"
import { Palette, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { refreshTenantTheme } from "@/contexts/tenant-theme.context"

interface ColorScheme {
  id: string
  label: string
  primary: string
  secondary: string
}

const COLOR_SCHEMES: ColorScheme[] = [
  { id: "rose",   label: "Rosa",    primary: "#e11d48", secondary: "#f43f5e" },
  { id: "violet", label: "Roxo",    primary: "#7c3aed", secondary: "#8b5cf6" },
  { id: "blue",   label: "Azul",    primary: "#2563eb", secondary: "#3b82f6" },
  { id: "teal",   label: "Ciano",   primary: "#0d9488", secondary: "#14b8a6" },
  { id: "green",  label: "Verde",   primary: "#16a34a", secondary: "#22c55e" },
  { id: "orange", label: "Laranja", primary: "#ea580c", secondary: "#f97316" },
  { id: "amber",  label: "Dourado", primary: "#d97706", secondary: "#f59e0b" },
  { id: "pink",   label: "Pink",    primary: "#db2777", secondary: "#ec4899" },
]

const LS_KEY = "voro:colorSchemeId"

export function ColorSchemePicker() {
  const [activeId, setActiveId] = useState<string>("rose")

  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY)
    if (saved) setActiveId(saved)
  }, [])

  function selectScheme(scheme: ColorScheme) {
    setActiveId(scheme.id)
    localStorage.setItem(LS_KEY, scheme.id)
    refreshTenantTheme(scheme.primary, scheme.secondary)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9 border-border bg-card">
          <Palette className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Trocar cores</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="p-3 w-48">
        <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Cor do sistema</p>
        <div className="grid grid-cols-4 gap-2">
          {COLOR_SCHEMES.map((scheme) => (
            <button
              key={scheme.id}
              title={scheme.label}
              onClick={() => selectScheme(scheme)}
              className="relative h-8 w-8 rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{
                backgroundColor: scheme.primary,
                borderColor: activeId === scheme.id ? scheme.primary : "transparent",
                boxShadow: activeId === scheme.id ? `0 0 0 2px white, 0 0 0 4px ${scheme.primary}` : undefined,
              }}
            >
              {activeId === scheme.id && (
                <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />
              )}
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
