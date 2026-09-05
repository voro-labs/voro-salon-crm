"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import Link from "next/link"
import { Plus, Search, UserCircle, Phone, Calendar, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { API_CONFIG } from "@/lib/api"
import { AuthGuard } from "@/components/auth/auth.guard"
import { fetcher } from "@/lib/fetcher"
import { usePlanLimits } from "@/hooks/use-plan-limits.hook"
import { PlanLimitModal } from "@/components/ui/custom/plan-limit-modal"
import { PageHeader } from "@/components/ui/custom/page-header"
import { useDataList, type PagedResult } from "@/hooks/use-data-list.hook"
import { AuthenticatedImage } from "@/components/ui/custom/authenticated-image"

// Os campos que a tela lê de cada item. O JSX mapeia com `(emp: any)`, então isto serve
// para tipar a busca no servidor, não para apertar o corpo do componente.
export interface EmployeeItem {
  id: string
  name: string
  photoUrl?: string
  isActive: boolean
  hireDate: string
  specialtyIds?: string[]
}

export function EmployeesView({ initialData }: { initialData?: PagedResult<EmployeeItem> }) {
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
  } = useDataList(API_CONFIG.ENDPOINTS.EMPLOYEES, { pageSize: 10, initialData })

  const { data: _svcRaw } = useSWR(API_CONFIG.ENDPOINTS.SERVICES + "?pageSize=500", fetcher)
  const services = _svcRaw?.items ?? (Array.isArray(_svcRaw) ? _svcRaw : undefined)
  const { maxEmployees } = usePlanLimits()

  const getServiceName = (id: string) => {
    return services?.find((s: any) => s.id === id)?.name || "Serviço"
  }

  const isAtLimit = maxEmployees !== -1 && totalCount >= maxEmployees

  const handleNewEmployee = () => {
    if (isAtLimit) {
      setShowLimitModal(true)
    } else {
      router.push("/employees/new")
    }
  }

  return (
    <AuthGuard requiredRoles={["SalonOwner", "Owner"]}>
      {showLimitModal && (
        <PlanLimitModal
          type="funcionários"
          limit={maxEmployees}
          onClose={() => setShowLimitModal(false)}
        />
      )}
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Funcionários"
          action={
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <div className="flex flex-wrap items-center gap-1.5 justify-between sm:justify-end">
                {maxEmployees !== -1 && (
                  <span className={`text-sm font-medium tabular-nums ${isAtLimit ? "text-destructive" : "text-muted-foreground"}`}>
                    {totalCount}/{maxEmployees}
                  </span>
                )}
                <Button size="sm" onClick={handleNewEmployee}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  <span className="hidden sm:inline">Novo Funcionário</span>
                  <span className="sm:hidden">Novo</span>
                </Button>
              </div>
            </div>
          }
        />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
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
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
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
              <UserCircle className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold text-foreground">
                {search ? "Nenhum resultado encontrado" : "Nenhum funcionário cadastrado"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {search ? "Tente buscar por outro nome." : "Comece adicionando seu primeiro funcionário."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((emp: any) => (
              <Link key={emp.id} href={`/employees/${emp.id}`}>
                <Card className="transition-colors hover:bg-accent/10">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold overflow-hidden">
                      {emp.photoUrl ? (
                        <AuthenticatedImage src={emp.photoUrl} alt={emp.name} className="h-full w-full rounded-full object-cover" />
                      ) : (
                        emp.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-foreground">{emp.name}</span>
                        {!emp.isActive && <Badge variant="secondary" className="text-[10px]">Inativo</Badge>}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Desde {new Date(emp.hireDate).toLocaleDateString()}
                        </span>
                        {emp.specialtyIds?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-amber-500" />
                            {emp.specialtyIds.length} especialidades
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {emp.specialtyIds?.slice(0, 3).map((sid: string) => (
                          <Badge key={sid} variant="outline" className="text-[10px] py-0">
                            {getServiceName(sid)}
                          </Badge>
                        ))}
                        {emp.specialtyIds?.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">+{emp.specialtyIds.length - 3}</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
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
