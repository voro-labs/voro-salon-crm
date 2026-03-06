"use client"

import type React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import { LoadingSimple } from "../ui/custom/loading/loading-simple"

interface ModuleGuardProps {
    children: React.ReactNode
    moduleId: number
}

export function ModuleGuard({ children, moduleId }: ModuleGuardProps) {
    const router = useRouter()
    const { data: modules, isLoading } = useSWR(API_CONFIG.ENDPOINTS.TENANT_MODULES, async (url) => {
        const res = await secureApiCall<any[]>(url, { method: "GET" })
        if (res.hasError) return []
        return res.data
    })

    useEffect(() => {
        if (!isLoading && modules) {
            const mod = (modules as any[]).find(m => m.module === moduleId)
            // Se o módulo existir e estiver desabilitado, redireciona
            // Se não existir na lista, assumimos que está habilitado por padrão (ou tratamos como erro)
            if (mod && !mod.isEnabled) {
                router.push("/not-authorized")
            }
        }
    }, [modules, isLoading, moduleId, router])

    if (isLoading) {
        return <LoadingSimple />
    }

    return <>{children}</>
}
