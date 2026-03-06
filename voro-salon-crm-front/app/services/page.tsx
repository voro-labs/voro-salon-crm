"use client"

import { useState, useCallback } from "react"
import useSWR from "swr"
import Link from "next/link"
import { Plus, Search, Scissors, Banknote, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { API_CONFIG, secureApiCall } from "@/lib/api"
import { AuthGuard } from "@/components/auth/auth.guard"

const fetcher = async (url: string) => {
  const result = await secureApiCall<any>(url, { method: "GET" })
  if (result.hasError) throw new Error(result.message || "Error")
  return result.data
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val)
}

export default function ServicesPage() {
  const [search, setSearch] = useState("")
  const { data, isLoading } = useSWR(API_CONFIG.ENDPOINTS.SERVICES, fetcher)

  const services = data ?? []

  const filtered = useCallback(() => {
    if (!search.trim()) return services
    const q = search.toLowerCase()
    return services.filter(
      (s: { name: string; description: string }) =>
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q))
    )
  }, [search, services])

  return (
    <AuthGuard requiredRoles={["User"]}>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Serviços</h1>
          <Button asChild size="sm">
            <Link href="/services/new">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Novo Serviço</span>
              <span className="sm:hidden">Novo</span>
            </Link>
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-48 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered().length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Scissors className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold text-foreground">
                {search ? "Nenhum resultado encontrado" : "Nenhum serviço cadastrado"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {search
                  ? "Tente buscar por outro termo."
                  : "Comece adicionando seu primeiro serviço no catálogo."}
              </p>
              {!search && (
                <Button asChild className="mt-4" size="sm">
                  <Link href="/services/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Serviço
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered().map(
              (service: {
                id: string
                name: string
                price: number
                description: string
              }) => (
                <Link key={service.id} href={`/services/${service.id}`}>
                  <Card className="transition-colors hover:bg-accent/10">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold text-sm">
                        <Scissors className="h-5 w-5" />
                      </div>
                      <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                        <span className="truncate font-medium text-foreground">
                          {service.name}
                        </span>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Banknote className="h-3 w-3" />
                            {formatCurrency(service.price)}
                          </span>
                          {service.description && (
                            <span className="truncate">{service.description}</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            )}
          </div>
        )}
      </div>
    </AuthGuard>
  )
}
