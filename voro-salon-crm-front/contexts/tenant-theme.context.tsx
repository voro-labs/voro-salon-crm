"use client"

import { createContext, useContext, useEffect, type ReactNode } from "react"
import { API_CONFIG, secureApiCall } from "@/lib/api"

interface TenantTheme {
  primaryColor: string | null
  secondaryColor: string | null
}

const TenantThemeContext = createContext<TenantTheme>({
  primaryColor: null,
  secondaryColor: null,
})

/**
 * Converts a hex color string (e.g. "#8B4513") to oklch components.
 * Returns null if the input is invalid.
 */
function hexToOklch(hex: string): { str: string; l: number; c: number; h: number } | null {
  const m = hex.match(/^#?([0-9a-f]{6})$/i)
  if (!m) return null
  const n = parseInt(m[1], 16)
  let r = ((n >> 16) & 0xff) / 255
  let g = ((n >> 8) & 0xff) / 255
  let b = (n & 0xff) / 255

  // sRGB → linear
  const lin = (v: number) =>
    v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  r = lin(r); g = lin(g); b = lin(b)

  // linear RGB → XYZ D65
  const X = 0.4124 * r + 0.3576 * g + 0.1805 * b
  const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const Z = 0.0193 * r + 0.1192 * g + 0.9505 * b

  // XYZ → OKLab (Bradford-adapted)
  const l_ = Math.cbrt(0.8189330101 * X + 0.3618667424 * Y - 0.1288597137 * Z)
  const m_ = Math.cbrt(0.0329845436 * X + 0.9293118715 * Y + 0.0361456387 * Z)
  const s_ = Math.cbrt(0.0482003018 * X + 0.2643662691 * Y + 0.6338517070 * Z)

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
  const bOk = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_

  // OKLab → OKLCH
  const C = Math.sqrt(a * a + bOk * bOk)
  const H = (Math.atan2(bOk, a) * 180) / Math.PI
  const h = H < 0 ? H + 360 : H

  return {
    str: `oklch(${L.toFixed(4)} ${C.toFixed(4)} ${h.toFixed(2)})`,
    l: L,
    c: C,
    h,
  }
}

/** Lightness boost applied to the chosen color in dark mode */
const DARK_L_BOOST = 0.30
const DARK_L_MIN   = 0.65
const DARK_L_MAX   = 0.85

/**
 * Injects a <style> tag that defines CSS variables for both :root (light) and .dark,
 * ensuring the primary/accent colors remain visible in dark mode even if the
 * tenant chose a very dark hex (e.g. #0f172a).
 */
function applyColors(primary: string | null, secondary: string | null) {
  let styleEl = document.getElementById("tenant-theme-vars") as HTMLStyleElement | null
  if (!styleEl) {
    styleEl = document.createElement("style")
    styleEl.id = "tenant-theme-vars"
    document.head.appendChild(styleEl)
  }

  const LIGHT_FG = "oklch(0.985 0.002 75)"
  const DARK_FG  = "oklch(0.10 0.01 285)"
  const fg = (l: number) => (l > 0.6 ? DARK_FG : LIGHT_FG)

  const blocks: string[] = []

  if (primary) {
    const ok = hexToOklch(primary)
    if (ok) {
      // Dark mode: boost lightness so it stays visible on dark backgrounds
      const darkL = Math.min(Math.max(ok.l + DARK_L_BOOST, DARK_L_MIN), DARK_L_MAX)
      const darkStr = `oklch(${darkL.toFixed(4)} ${ok.c.toFixed(4)} ${ok.h.toFixed(2)})`

      blocks.push(
        `:root {\n` +
        `  --primary: ${ok.str};\n` +
        `  --primary-foreground: ${fg(ok.l)};\n` +
        `  --sidebar-primary: ${ok.str};\n` +
        `  --sidebar-primary-foreground: ${fg(ok.l)};\n` +
        `  --ring: ${ok.str};\n` +
        `}`,
        `.dark {\n` +
        `  --primary: ${darkStr};\n` +
        `  --primary-foreground: ${fg(darkL)};\n` +
        `  --sidebar-primary: ${darkStr};\n` +
        `  --sidebar-primary-foreground: ${fg(darkL)};\n` +
        `  --ring: ${darkStr};\n` +
        `}`,
      )
    }
  }

  if (secondary) {
    const ok = hexToOklch(secondary)
    if (ok) {
      const darkL = Math.min(Math.max(ok.l + DARK_L_BOOST, DARK_L_MIN), DARK_L_MAX)
      const darkStr = `oklch(${darkL.toFixed(4)} ${ok.c.toFixed(4)} ${ok.h.toFixed(2)})`

      blocks.push(
        `:root {\n` +
        `  --accent: ${ok.str};\n` +
        `  --accent-foreground: ${fg(ok.l)};\n` +
        `  --sidebar-accent: ${ok.str};\n` +
        `  --sidebar-accent-foreground: ${fg(ok.l)};\n` +
        `}`,
        `.dark {\n` +
        `  --accent: ${darkStr};\n` +
        `  --accent-foreground: ${fg(darkL)};\n` +
        `  --sidebar-accent: ${darkStr};\n` +
        `  --sidebar-accent-foreground: ${fg(darkL)};\n` +
        `}`,
      )
    }
  }

  styleEl.textContent = blocks.join("\n")
}

const LS_KEY = "voro:tenantTheme"

/** Generic salon brand applied when no cached/API tenant theme exists */
const DEFAULT_THEME: TenantTheme = {
  primaryColor: "#e11d48",   // rose-600 — energetic, salon-friendly default
  secondaryColor: "#f43f5e", // rose-500
}

export function TenantThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // 1. Apply cached colors immediately — works on ALL pages including admin/sign-in
    let applied = false
    try {
      const cached = localStorage.getItem(LS_KEY)
      if (cached) {
        const { primaryColor, secondaryColor } = JSON.parse(cached) as TenantTheme
        applyColors(primaryColor, secondaryColor)
        applied = true
      }
    } catch { }

    // 2. No cache = first-time visitor: apply generic default so admin pages look branded
    if (!applied) {
      applyColors(DEFAULT_THEME.primaryColor, DEFAULT_THEME.secondaryColor)
    }

    // 3. Only fetch fresh colors from API if authenticated
    const token = localStorage.getItem("vorolabs_salon_token")
    if (!token) return

    // 4. Fetch fresh colors from API
    secureApiCall<{ primaryColor: string | null; secondaryColor: string | null }>(
      API_CONFIG.ENDPOINTS.TENANT_ME,
      { method: "GET" }
    ).then((res) => {
      if (!res.hasError && res.data) {
        const { primaryColor, secondaryColor } = res.data
        // Fall back to default if tenant hasn't set custom colors
        const p = primaryColor ?? DEFAULT_THEME.primaryColor
        const s = secondaryColor ?? DEFAULT_THEME.secondaryColor
        applyColors(p, s)
        localStorage.setItem(LS_KEY, JSON.stringify({ primaryColor: p, secondaryColor: s }))
      }
    }).catch(() => { })
  }, [])

  return (
    <TenantThemeContext.Provider value={{ primaryColor: null, secondaryColor: null }}>
      {children}
    </TenantThemeContext.Provider>
  )
}

export function useTenantTheme() {
  return useContext(TenantThemeContext)
}

/**
 * Call this after saving settings so colors update immediately without a full page reload.
 */
export function refreshTenantTheme(primaryColor: string | null, secondaryColor: string | null) {
  applyColors(primaryColor, secondaryColor)
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ primaryColor, secondaryColor }))
  } catch { }
}
