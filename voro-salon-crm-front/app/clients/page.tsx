"use client"

import { useState, useCallback } from "react"
import useSWR from "swr"
import Link from "next/link"
import { Plus, Search, Phone, Mail, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { API_CONFIG, secureApiCall } from "@/lib/api"

const fetcher = async (url: string) => {
  const result = await secureApiCall<any>(url, { method: "GET" })
  if (result.hasError) throw new Error(result.message || "Error")
  return result.data
}

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, "")
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return phone
}

export default function ClientesPage() {
  const [search, setSearch] = useState("")
  const { data, isLoading } = useSWR(API_CONFIG.ENDPOINTS.CLIENTS, fetcher)

  const clients = data ?? []

  const filtered = useCallback(() => {
    if (!search.trim()) return clients
    const q = search.toLowerCase()
    return clients.filter(
      (c: { name: string; phone: string; email: string }) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email && c.email.toLowerCase().includes(q))
    )
  }, [search, clients])

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Clientes</h1>
        <Button asChild size="sm">
          <Link href="/clients/new">
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Novo Cliente</span>
            <span className="sm:hidden">Novo</span>
          </Link>
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, telefone ou email..."
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
                  <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
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
            <UserRound className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold text-foreground">
              {search ? "Nenhum resultado encontrado" : "Nenhum cliente cadastrado"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {search
                ? "Tente buscar por outro termo."
                : "Comece adicionando seu primeiro cliente."}
            </p>
            {!search && (
              <Button asChild className="mt-4" size="sm">
                <Link href="/clients/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Cliente
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered().map(
            (client: {
              id: string
              name: string
              phone: string
              email: string
              notes: string
              serviceCount: number
            }) => (
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
                        {client.serviceCount === 1 ? "servico" : "servicos"}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          )}
        </div>
      )}
    </div>
  )
}
