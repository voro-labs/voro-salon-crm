"use client"

import { useState, useCallback, useEffect } from "react"
import useSWR from "swr"
import Link from "next/link"
import { Plus, Search, UserCircle, Phone, Calendar, Star, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { API_CONFIG, secureApiCall, getAuthToken } from "@/lib/api"
import { AuthGuard } from "@/components/auth/auth.guard"

function AuthenticatedImage({ src, alt, className }: { src: string, alt: string, className?: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!src) {
      setBlobUrl(null)
      setLoading(false)
      return
    }

    if (!src.includes("blob.vercel-storage.com")) {
      setBlobUrl(src)
      setLoading(false)
      return
    }

    if (src.startsWith("data:") || src.startsWith("blob:")) {
      setBlobUrl(src)
      setLoading(false)
      return
    }

    let isMounted = true
    const fetchSignedUrl = async () => {
      setLoading(true)
      try {
        const proxyUrl = `/api/blob/proxy?url=${encodeURIComponent(src)}`
        const response = await fetch(proxyUrl)
        if (!response.ok) throw new Error("Failed to fetch signed URL via proxy")
        const data = await response.json()
        if (isMounted) setBlobUrl(data.url)
      } catch (err) {
        console.error("Error fetching signed URL:", err)
        if (isMounted) setBlobUrl(null)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchSignedUrl()
    return () => { isMounted = false }
  }, [src])

  if (loading) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted/30`}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!blobUrl) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted/30`}>
        <UserCircle className="h-6 w-6 text-muted-foreground/50" />
      </div>
    )
  }

  return <img src={blobUrl} alt={alt} className={className} />
}

const fetcher = async (url: string) => {
  const result = await secureApiCall<any[]>(url, { method: "GET" })
  if (result.hasError) throw new Error(result.message || "Error")
  return result.data
}

export default function EmployeesPage() {
  const [search, setSearch] = useState("")
  const { data: employees, isLoading } = useSWR(API_CONFIG.ENDPOINTS.EMPLOYEES, fetcher)
  const { data: services } = useSWR(API_CONFIG.ENDPOINTS.SERVICES, async (url) => {
    const res = await secureApiCall<any[]>(url, { method: "GET" })
    return res.data || []
  })

  const filtered = useCallback(() => {
    if (!employees) return []
    if (!search.trim()) return employees
    const q = search.toLowerCase()
    return employees.filter(
      (e: any) =>
        e.name.toLowerCase().includes(q)
    )
  }, [search, employees])

  const getServiceName = (id: string) => {
    return services?.find(s => s.id === id)?.name || "Serviço"
  }

  return (
    <AuthGuard requiredRoles={["User"]}>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Funcionários</h1>
          <Button asChild size="sm">
            <Link href="/employees/new">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Novo Funcionário</span>
              <span className="sm:hidden">Novo</span>
            </Link>
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

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
        ) : filtered().length === 0 ? (
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
            {filtered().map((emp: any) => (
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
      </div>
    </AuthGuard>
  )
}
