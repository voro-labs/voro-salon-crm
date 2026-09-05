"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, Search, Phone, Mail, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { API_CONFIG } from "@/lib/api"
import { AuthGuard } from "@/components/auth/auth.guard"
import { formatPhone } from "@/lib/mask-utils"

import { useDataList, type PagedResult } from "@/hooks/use-data-list.hook"
import { usePlanLimits } from "@/hooks/use-plan-limits.hook"
import { PageHeader } from "@/components/ui/custom/page-header"
import { EmptyState } from "@/components/ui/custom/empty-state"
import { ListSkeleton } from "@/components/ui/custom/list-skeleton"
import { PlanLimitModal } from "@/components/ui/custom/plan-limit-modal"
import { ExportMenu } from "@/components/ui/custom/export-menu"

export interface ClientItem {
  id: string
  name: string
  phone: string
  email: string
  notes: string
  serviceCount: number
}

export function ClientsView({ initialData }: { initialData?: PagedResult<ClientItem> }) {
  const router = useRouter()
  const [showLimitModal, setShowLimitModal] = useState(false)

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
    mutate,
  } = useDataList<ClientItem>(API_CONFIG.ENDPOINTS.CLIENTS, { pageSize: 10, initialData })

  const { maxClients } = usePlanLimits()

  const isAtLimit = maxClients !== -1 && totalCount >= maxClients

  const handleNewClient = () => {
    if (isAtLimit) {
      setShowLimitModal(true)
    } else {
      router.push("/clients/new")
    }
  }

  return (
    <AuthGuard requiredRoles={["SalonOwner", "SalonEmployee", "Owner"]}>
      {showLimitModal && (
        <PlanLimitModal
          type="clientes"
          limit={maxClients}
          onClose={() => setShowLimitModal(false)}
        />
      )}
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Clientes"
          action={
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <div className="flex flex-wrap items-center gap-1.5 justify-between sm:justify-end">
                {maxClients !== -1 && (
                  <span className={`text-sm font-medium tabular-nums ${isAtLimit ? "text-destructive" : "text-muted-foreground"}`}>
                    {totalCount}/{maxClients}
                  </span>
                )}
                <ExportMenu
                  size="sm"
                  rows={items}
                  filename="clientes"
                  columns={[
                    { header: "Nome", value: (c: any) => c.name },
                    { header: "Telefone", value: (c: any) => c.phone ?? "" },
                    { header: "E-mail", value: (c: any) => c.email ?? "" },
                    { header: "Observações", value: (c: any) => c.notes ?? "" },
                    { header: "Qtd. Serviços", value: (c: any) => c.serviceCount ?? 0 },
                  ]}
                />
                <Button size="sm" onClick={handleNewClient}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  <span className="hidden sm:inline">Novo Cliente</span>
                  <span className="sm:hidden">Novo</span>
                </Button>
              </div>
            </div>
          }
        />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou email..."
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
          <ListSkeleton type="cards" count={5} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={UserRound}
            title={search ? "Nenhum resultado encontrado" : "Nenhum cliente cadastrado"}
            description={search ? "Tente buscar por outro termo." : "Comece adicionando seu primeiro cliente."}
            action={!search ? (
              <Button size="sm" onClick={handleNewClient}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Cliente
              </Button>
            ) : undefined}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((client) => (
                <Link key={client.id} href={`/clients/${client.id}`}>
                  <Card className="transition-colors hover:bg-accent/10">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        {client.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                        <span className="truncate font-medium text-foreground">
                          {client.name}
                        </span>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {formatPhone(client.phone)}
                          </span>
                          {client.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{client.email}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      {client.serviceCount > 0 && (
                        <Badge variant="secondary" className="shrink-0">
                          {client.serviceCount}{" "}
                          {client.serviceCount === 1 ? "serviço" : "serviços"}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              )
            )}
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
