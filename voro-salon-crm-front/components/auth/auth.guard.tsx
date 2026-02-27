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
  requiredRoles?: ("Admin" | "User" | "Trainer" | "Student")[]
}

export function AuthGuard({ children, requiredRoles }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      const token = getAuthToken()

      // Se não há token ou usuário, redirecionar para login
      if (!token) {
        router.push("/admin/sign-in")
        return
      }

      if (!user?.roles) {
        router.push("/admin/sign-in")
        return
      }

      // Se há role requerido e o usuário não tem permissão
      const hasRequiredRole = requiredRoles
        ? user.roles.some(role => requiredRoles.includes(role.name as any))
        : false

      const hasAllowedRole = rolesAllowed
        ? user.roles.some(role => rolesAllowed.includes(role.name as any))
        : false

      if (!hasRequiredRole && !hasAllowedRole) {
        router.push("/not-authorized") // Redireciona para dashboard padrão
        return
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
