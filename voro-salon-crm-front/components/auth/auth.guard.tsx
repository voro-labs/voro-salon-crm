"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth.context"
import { getAuthToken } from "@/lib/api"
import { rolesAllowed } from "@/lib/allowed-utils"
import { LoadingSimple } from "../ui/custom/loading/loading-simple"

interface AuthGuardProps {
  children: React.ReactNode
  requiredRoles?: ("Owner" | "SalonOwner" | "SalonEmployee" | "SalonClient")[]
}

export function AuthGuard({ children, requiredRoles }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      const token = getAuthToken()

      // Se não há token ou usuário, redirecionar para preços
      if (!token) {
        router.push("/prices")
        return
      }

      if (!user?.roles) {
        router.push("/admin/sign-in")
        return
      }

      if (requiredRoles) {
        // Quando roles específicas são exigidas, apenas elas concedem acesso
        const hasRequiredRole = user.roles.some(role => requiredRoles.includes(role.name as any))
        if (!hasRequiredRole) {
          router.push("/not-authorized")
          return
        }
      } else {
        // Sem roles específicas: qualquer role reconhecida é suficiente
        const hasAllowedRole = user.roles.some(role => rolesAllowed.includes(role.name as any))
        if (!hasAllowedRole) {
          router.push("/not-authorized")
          return
        }
      }
    }
  }, [user, loading, router, requiredRoles])

  if (loading) {
    return <LoadingSimple />
  }

  if (!getAuthToken()) {
    return <LoadingSimple />
  }

  return <>{children}</>
}
