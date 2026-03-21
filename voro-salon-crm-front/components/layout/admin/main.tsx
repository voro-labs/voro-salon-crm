"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { LoadingSimple } from "../../ui/custom/loading/loading-simple"
import { useAuth } from "@/contexts/auth.context"
import { routesAllowed } from "@/lib/allowed-utils"
import { Navbar } from "./navbar"
import { Sidebar } from "./sidebar"
import useSWR from "swr"
import { API_CONFIG, secureApiCall } from "@/lib/api"

import { ThemeToggle } from "../../theme-toggle"
import { useBrowserNotifications } from "@/contexts/browser-notifications.context"
import { useSubscription } from "@/hooks/use-subscription.hook"
import { SubscriptionPaywall } from "@/components/subscription/subscription-paywall"

// Páginas de onboarding obrigatório — o guard não redireciona quando já está nelas
const ONBOARDING_PATHS = [
  "/admin/change-password",
  "/admin/terms",
  "/admin/complete-profile",
]

interface MainProps {
  children: React.ReactNode
}

export function Main({ children }: MainProps) {
  const { user, loading } = useAuth()
  const { requestPermission } = useBrowserNotifications()
  const { isTrialExpired, trialEndsAt, mutate: refreshSubscription } = useSubscription()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const { data: tenant } = useSWR(
    user?.token ? API_CONFIG.ENDPOINTS.TENANT_ME : null,
    async (url) => {
      const res = await secureApiCall<any>(url, { method: "GET" })
      if (res.hasError) throw new Error(res.message || "Failed to fetch tenant")
      return res.data
    }
  )

  // Solicita permissão para notificações do navegador ao autenticar
  useEffect(() => {
    if (user?.token) {
      requestPermission()
    }
  }, [user?.token, requestPermission])

  // Guard de onboarding obrigatório: redireciona para a primeira etapa pendente
  // enquanto o usuário estiver autenticado e não tiver cumprido as flags pós-login
  useEffect(() => {
    if (!user?.token) return
    if (ONBOARDING_PATHS.some((p) => pathname.startsWith(p))) return

    const flagsRaw = sessionStorage.getItem("post_login_flags")
    if (!flagsRaw) return

    try {
      const flags = JSON.parse(flagsRaw)
      if (flags.requiresPasswordChange) {
        router.replace("/admin/change-password")
      } else if (flags.requiresTermsAcceptance) {
        router.replace("/admin/terms")
      } else if (flags.requiresProfileCompletion) {
        router.replace("/admin/complete-profile")
      } else {
        sessionStorage.removeItem("post_login_flags")
      }
    } catch {
      sessionStorage.removeItem("post_login_flags")
    }
  }, [user, pathname, router])

  useEffect(() => {
    if (tenant) {
      if (tenant.name) {
        document.title = `${tenant.name} - CRM`
      }
      if (tenant.logoUrl) {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
        if (!link) {
          link = document.createElement("link")
          link.rel = "icon"
          document.head.appendChild(link)
        }
        link.href = tenant.logoUrl
      }
    }
  }, [tenant])

  if (loading) {
    return <LoadingSimple />
  }

  if (!user?.token) {
    const isPublicRoute = routesAllowed.some(item => pathname.startsWith(item))

    if (!isPublicRoute) {
      // Rota protegida sem usuário: redireciona para preços
      router.replace("/prices")
    }

    // Layout público (sign-in, forgot-password, etc.) — nunca mostra loading aqui
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>
        <main className="flex-1">{children}</main>
      </div>
    )
  }

  // Páginas de onboarding obrigatório renderizam sem sidebar/navbar
  if (ONBOARDING_PATHS.some((p) => pathname.startsWith(p))) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>
        <main className="flex-1">{children}</main>
      </div>
    )
  }

  // Paywall de trial expirado
  if (isTrialExpired) {
    return <SubscriptionPaywall trialEndsAt={trialEndsAt} onRefresh={() => refreshSubscription()} />
  }

  // Layout autenticado
  return (
    <div
      className="min-h-screen"
      style={{
        ...(tenant?.primaryColor ? { "--primary": tenant.primaryColor } : {}),
        ...(tenant?.secondaryColor ? { "--secondary": tenant.secondaryColor } : {}),
      } as React.CSSProperties}
    >
      <div className="flex">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} tenant={tenant} />

        <div className="flex-1 min-w-0">
          <Navbar isOpen={isSidebarOpen} onMenuClick={() => setIsSidebarOpen(true)} tenant={tenant} />
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}
