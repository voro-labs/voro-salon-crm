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

import { ThemeToggle } from "@/components/ui/custom/theme-toggle"
import { useBrowserNotifications } from "@/contexts/browser-notifications.context"
import { useSubscription } from "@/hooks/use-subscription.hook"
import { SubscriptionPaywall } from "@/components/features/subscription/subscription-paywall"

// Páginas de onboarding obrigatório — o guard não redireciona quando já está nelas
const ONBOARDING_PATHS = [
  "/admin/change-password",
  "/admin/terms",
  "/admin/complete-profile",
]

// Rotas de landing que têm navbar própria — não devem exibir o ThemeToggle flutuante
const LANDING_PATHS = ["/prices", "/privacy", "/refund", "/terms", "/cookies", "/"]

interface MainProps {
  children: React.ReactNode
}

export function Main({ children }: MainProps) {
  const { user, loading } = useAuth()
  const { requestPermission } = useBrowserNotifications()
  const { isPaywalled, trialEndsAt, mutate: refreshSubscription } = useSubscription()
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

  const isPublicRoute = routesAllowed.some(item => pathname === item || (item !== "/" && pathname.startsWith(item)))
  const isOnboardingRoute = ONBOARDING_PATHS.some(p => pathname.startsWith(p))
  const isAuthRoute = ["/admin/sign-in", "/admin/forgot-password", "/admin/reset-password", "/admin/verify-2fa"].some(p => pathname.startsWith(p))
  const needsLoginRedirect = !loading && !user?.token && !isPublicRoute

  useEffect(() => {
    if (needsLoginRedirect) {
      router.replace(`/admin/sign-in?redirect=${encodeURIComponent(pathname)}`)
    }
  }, [needsLoginRedirect, pathname, router])

  if (loading || needsLoginRedirect) {
    return <LoadingSimple />
  }

  // Se não estiver logado, ou se estiver logado mas em uma página de autenticação (Sign-in, etc.)
  // Renderiza o shell minimalista sem sidebar/navbar.
  if (!user?.token || (isAuthRoute && !isOnboardingRoute)) {

    // Layout público (sign-in, forgot-password, etc.) — nunca mostra sidebar/navbar aqui,
    // mesmo que o usuário esteja logado (mas ainda na página de login aguardando redirect)
    const hasOwnNavbar = LANDING_PATHS.some((p) => pathname === p)

    return (
      <div className="min-h-screen bg-background text-foreground">
        {!hasOwnNavbar && (
          <div className="fixed top-4 right-4 z-50">
            <ThemeToggle />
          </div>
        )}
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

  // Paywall: trial expirado ou assinatura inativa — exceto na página de assinatura e para funcionários
  const isEmployee = (user.roles?.length ?? 0) > 0 && (user.roles ?? []).every(r => r.name === "SalonEmployee")
  if (isPaywalled && !pathname.startsWith("/subscription") && !isEmployee) {
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
