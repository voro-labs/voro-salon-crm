"use client"

import Link from "next/link"
import useSWR from "swr"
import { Plus, Search, Scissors, Banknote, Tag, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { API_CONFIG } from "@/lib/api"
import { fetcher } from "@/lib/fetcher"
import { formatCurrency, formatDuration } from "@/lib/format-utils"
import { AuthGuard } from "@/components/auth/auth.guard"
import { PageHeader } from "@/components/ui/custom/page-header"
import { useDataList, type PagedResult } from "@/hooks/use-data-list.hook"

export interface ServiceItem {
  id: string
  name: string
  price: number
  durationMinutes: number
  description?: string
}

interface ServicePromotion {
  id: string
  serviceId: string
  promotionalPrice: number
  daysOfWeek: number[]
  validFrom?: string
  validUntil?: string
  isActive: boolean
}


function getActivePromotion(serviceId: string, promotions: ServicePromotion[]): ServicePromotion | null {
  const now = new Date()
  const todayDow = now.getDay()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return promotions.find((p) => {
    if (p.serviceId !== serviceId || !p.isActive) return false
    if (!p.daysOfWeek.includes(todayDow)) return false
    if (p.validFrom) {
      const [y, m, d] = p.validFrom.split("-").map(Number)
      if (today < new Date(y, m - 1, d)) return false
    }
    if (p.validUntil) {
      const [y, m, d] = p.validUntil.split("-").map(Number)
      if (today > new Date(y, m - 1, d)) return false
    }
    return true
  }) ?? null
}

export function ServicesView({ initialData }: { initialData?: PagedResult<ServiceItem> }) {
  const {
    items,
    totalCount,
    totalPages,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    isLoading,
  } = useDataList<ServiceItem>(API_CONFIG.ENDPOINTS.SERVICES, { pageSize: 10, initialData })

  const { data: _promosRaw } = useSWR("/ServicePromotion", fetcher)
  const promotions: ServicePromotion[] = (() => {
    if (!_promosRaw) return []
    if (Array.isArray(_promosRaw)) return _promosRaw
    if (Array.isArray(_promosRaw?.items)) return _promosRaw.items
    if (Array.isArray(_promosRaw?.data)) return _promosRaw.data
    return []
  })()

  return (
    <AuthGuard requiredRoles={["SalonOwner", "Owner"]}>
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Serviços"
          action={
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <div className="flex flex-wrap items-center gap-1.5 justify-between sm:justify-end">
                <Button asChild size="sm" variant="outline">
                  <Link href="/services/promotions">
                    <Tag className="mr-1.5 h-4 w-4" />
                    <span className="hidden sm:inline">Promoções</span>
                    <span className="sm:hidden">Promoções</span>
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/services/new">
                    <Plus className="mr-1.5 h-4 w-4" />
                    <span className="hidden sm:inline">Novo Serviço</span>
                    <span className="sm:hidden">Novo</span>
                  </Link>
                </Button>
              </div>
            </div>
          }
        />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {!isLoading && totalCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">{totalCount} registro{totalCount !== 1 ? "s" : ""}</p>
              <span className="text-muted-foreground/40 text-sm">·</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-muted-foreground">Por página:</span>
                <div className="flex items-center gap-1">
                  {[5, 10, 20, 25, 50].map((n) => (
                    <button
                      key={n}
                      onClick={() => setPageSize(n)}
                      className={`h-6 min-w-7 px-1.5 rounded text-xs font-medium transition-colors ${
                        pageSize === n
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
                <span className="text-sm">Página {page} de {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
              </div>
            )}
          </div>
        )}

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
        ) : items.length === 0 ? (
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
            {items.map((service) => {
              const promo = getActivePromotion(service.id, promotions)
              return (
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
                          {service.durationMinutes > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(service.durationMinutes)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Banknote className="h-3 w-3" />
                            {promo ? (
                              <>
                                <span className="line-through opacity-60">{formatCurrency(service.price)}</span>
                                <span className="font-semibold text-green-600 dark:text-green-400 ml-1">
                                  {formatCurrency(promo.promotionalPrice)}
                                </span>
                                <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 border-green-500 text-green-600 dark:text-green-400">
                                  promo
                                </Badge>
                              </>
                            ) : (
                              formatCurrency(service.price)
                            )}
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
            })}
          </div>
        )}

        {totalCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">{totalCount} registro{totalCount !== 1 ? "s" : ""}</p>
              <span className="text-muted-foreground/40 text-sm">·</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-muted-foreground">Por página:</span>
                <div className="flex items-center gap-1">
                  {[5, 10, 20, 25, 50].map((n) => (
                    <button
                      key={n}
                      onClick={() => setPageSize(n)}
                      className={`h-6 min-w-7 px-1.5 rounded text-xs font-medium transition-colors ${
                        pageSize === n
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </Button>
                <span className="text-sm">Página {page} de {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próxima
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </AuthGuard>
  )
}
