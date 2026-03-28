"use client"

import { useState } from "react"
import useSWR from "swr"
import { MessageCircle, ArrowDownLeft, ArrowUpRight, Search, Loader2, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { API_CONFIG } from "@/lib/api"
import { fetcher } from "@/lib/fetcher"
import { AuthGuard } from "@/components/auth/auth.guard"
import { ModuleGuard } from "@/components/auth/module-guard"
import { PageHeader } from "@/components/ui/custom/page-header"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface WhatsAppMessage {
  id: string
  tenantId: string
  direction: "inbound" | "outbound"
  from: string
  to: string
  body: string
  whatsAppMessageId: string | null
  status: string
  timestamp: string
}

const STATUS_LABEL: Record<string, string> = {
  received: "Recebida",
  sent: "Enviada",
  delivered: "Entregue",
  read: "Lida",
  failed: "Falhou",
}

const STATUS_COLOR: Record<string, string> = {
  received: "bg-blue-500/10 text-blue-600 border-blue-200",
  sent: "bg-muted text-muted-foreground",
  delivered: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  read: "bg-emerald-500/20 text-emerald-700 border-emerald-300",
  failed: "bg-rose-500/10 text-rose-600 border-rose-200",
}

export default function WhatsAppMessagesPage() {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 50

  const { data: messages, isLoading, mutate } = useSWR<WhatsAppMessage[]>(
    `${API_CONFIG.ENDPOINTS.WHATSAPP_MESSAGES}?page=${page}&pageSize=${PAGE_SIZE}`,
    fetcher
  )

  const filtered = (messages ?? []).filter((m) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      m.body.toLowerCase().includes(q) ||
      m.from.includes(q) ||
      m.to.includes(q)
    )
  })

  const inboundCount = (messages ?? []).filter((m) => m.direction === "inbound").length
  const outboundCount = (messages ?? []).filter((m) => m.direction === "outbound").length

  return (
    <AuthGuard requiredRoles={["SalonOwner", "Owner"]}>
      <ModuleGuard moduleId={9}>
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Mensagens WhatsApp"
          description="Histórico de conversas recebidas e enviadas."
          action={
            <Button variant="outline" size="sm" onClick={() => mutate()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          }
        />

        {/* Resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-2xl font-bold mt-1">{messages?.length ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Recebidas</p>
              <p className="text-2xl font-bold mt-1 text-blue-600">{inboundCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Enviadas</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600">{outboundCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Página</p>
              <p className="text-2xl font-bold mt-1">{page}</p>
            </CardContent>
          </Card>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número ou conteúdo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Carregando mensagens...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl border-dashed">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <MessageCircle className="h-7 w-7 text-primary" />
            </div>
            <p className="font-semibold">Nenhuma mensagem encontrada</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search ? "Tente outro termo de busca." : "As mensagens aparecerão aqui conforme forem trocadas."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((msg) => {
              const isInbound = msg.direction === "inbound"
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3 p-4 rounded-xl border bg-card transition-colors hover:bg-muted/40",
                    isInbound ? "border-l-4 border-l-blue-400" : "border-l-4 border-l-emerald-400"
                  )}
                >
                  {/* Ícone de direção */}
                  <div className={cn(
                    "shrink-0 rounded-full p-2 mt-0.5",
                    isInbound ? "bg-blue-500/10 text-blue-600" : "bg-emerald-500/10 text-emerald-600"
                  )}>
                    {isInbound
                      ? <ArrowDownLeft className="h-4 w-4" />
                      : <ArrowUpRight className="h-4 w-4" />
                    }
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground">
                        {isInbound ? msg.from : msg.to}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] px-1.5 py-0", STATUS_COLOR[msg.status] ?? "")}
                      >
                        {STATUS_LABEL[msg.status] ?? msg.status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {format(new Date(msg.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground break-words">{msg.body}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Paginação */}
        {!isLoading && (messages?.length ?? 0) >= PAGE_SIZE && (
          <div className="flex justify-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        )}
      </div>
      </ModuleGuard>
    </AuthGuard>
  )
}
