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

interface MainProps {
  children: React.ReactNode
}

export function Main({ children }: MainProps) {
  const { user, loading } = useAuth()
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
    // Redirecionar para sign-in se não estiver na página inicial
    if (typeof window !== "undefined" && !routesAllowed.some(item => window.location.pathname.startsWith(item))) {
      router.push("/admin/sign-in")
      return <LoadingSimple />
    }

    // Layout público (não autenticado)
    return (
      <div className="min-h-screen">
        <main className="flex-1">{children}</main>
      </div>
    )
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

        <div className="flex-1">
          <Navbar isOpen={isSidebarOpen} onMenuClick={() => setIsSidebarOpen(true)} tenant={tenant} />
          <main>{children}</main>
        </div>
      </div>
    </div>
  )
}
