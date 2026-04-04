"use client"

import Link from "next/link"
import { Plus, Search, Scissors, Banknote, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

import { API_CONFIG } from "@/lib/api"
import { AuthGuard } from "@/components/auth/auth.guard"
import { PageHeader } from "@/components/ui/custom/page-header"
import { useDataList } from "@/hooks/use-data-list.hook"

function formatCurrency(val: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val)
}

export default function ServicesPage() {
  const {
    items,
    totalCount,
    totalPages,
    page,
    setPage,
    search,
    setSearch,
    isLoading,
  } = useDataList(API_CONFIG.ENDPOINTS.SERVICES, { pageSize: 20 })

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
            {items.map(
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">{totalCount} registros</p>
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
          </div>
        )}
      </div>
    </AuthGuard>
  )
}
