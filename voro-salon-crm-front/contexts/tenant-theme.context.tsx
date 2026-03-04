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
 * Converts a hex color string (e.g. "#8B4513") to an oklch() string
 * by going through sRGB → linear RGB → XYZ D65 → OKLab → OKLCH.
 * Returns null if the input is invalid.
 */
function hexToOklch(hex: string): string | null {
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
    const deg = H < 0 ? H + 360 : H

    return `oklch(${L.toFixed(4)} ${C.toFixed(4)} ${deg.toFixed(2)})`
}

function applyColors(primary: string | null, secondary: string | null) {
    const root = document.documentElement
    if (primary) {
        const ok = hexToOklch(primary)
        if (ok) {
            root.style.setProperty("--primary", ok)
            root.style.setProperty("--sidebar-primary", ok)
            root.style.setProperty("--ring", ok)
        }
    }
    if (secondary) {
        const ok = hexToOklch(secondary)
        if (ok) {
            root.style.setProperty("--accent", ok)
            root.style.setProperty("--sidebar-accent", ok)
        }
    }
}

const LS_KEY = "voro:tenantTheme"

export function TenantThemeProvider({ children }: { children: ReactNode }) {
    useEffect(() => {
        // 1. Apply cached colors immediately to avoid flash
        try {
            const cached = localStorage.getItem(LS_KEY)
            if (cached) {
                const { primaryColor, secondaryColor } = JSON.parse(cached) as TenantTheme
                applyColors(primaryColor, secondaryColor)
            }
        } catch { }

        // 2. Fetch fresh colors from API
        secureApiCall<{ primaryColor: string | null; secondaryColor: string | null }>(
            API_CONFIG.ENDPOINTS.TENANT_ME,
            { method: "GET" }
        ).then((res) => {
            if (!res.hasError && res.data) {
                const { primaryColor, secondaryColor } = res.data
                applyColors(primaryColor, secondaryColor)
                localStorage.setItem(LS_KEY, JSON.stringify({ primaryColor, secondaryColor }))
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
