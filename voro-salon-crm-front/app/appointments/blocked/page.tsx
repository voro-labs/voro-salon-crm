"use client"

import { useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { ArrowLeft, Ban, Trash2, Loader2, CalendarClock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { AuthGuard } from "@/components/auth/auth.guard"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import { fetcher } from "@/lib/fetcher"
import { BlockTimeSlotDialog } from "@/components/features/appointments/block-time-slot-dialog"

interface TimeSlotBlock {
  id: string
  startDateTime: string
  endDateTime: string
  reason: string | null
  clientMessage: string | null
  createdAt: string
}

export default function BlockedSlotsPage() {
  const { data: blocks, isLoading, mutate } = useSWR<TimeSlotBlock[]>(
    API_CONFIG.ENDPOINTS.TIME_SLOT_BLOCKS,
    fetcher
  )

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    try {
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.TIME_SLOT_BLOCKS}/${deletingId}`, {
        method: "DELETE",
      })
      if (res.hasError) throw new Error(res.message || "Erro ao remover bloqueio.")
      toast.success("Bloqueio removido com sucesso.")
      mutate()
      setDeletingId(null)
    } catch (err: any) {
      toast.error(err.message || "Não foi possível remover o bloqueio.")
    } finally {
      setIsDeleting(false)
    }
  }

  const formatRange = (start: string, end: string) => {
    const s = new Date(start)
    const e = new Date(end)
    const sameDay = s.toDateString() === e.toDateString()
    if (sameDay) {
      return `${format(s, "dd/MM/yyyy", { locale: ptBR })} · ${format(s, "HH:mm")} – ${format(e, "HH:mm")}`
    }
    return `${format(s, "dd/MM/yyyy HH:mm", { locale: ptBR })} – ${format(e, "dd/MM/yyyy HH:mm", { locale: ptBR })}`
  }

  return (
    <AuthGuard requiredRoles={["SalonOwner", "Owner"]}>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/appointments">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <span className="text-sm text-muted-foreground">Agendamentos</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Horários Bloqueados</h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie os bloqueios de agenda ativos.</p>
          </div>
          <BlockTimeSlotDialog onSuccess={() => mutate()} />
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Ban className="mr-2 h-5 w-5 text-primary" />
              Bloqueios Ativos
            </CardTitle>
            <CardDescription>
              Horários que estão indisponíveis para agendamento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Carregando bloqueios...
              </div>
            ) : !blocks || blocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed">
                <div className="rounded-full bg-primary/10 p-3 mb-4">
                  <CalendarClock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Nenhum bloqueio ativo</h3>
                <p className="text-muted-foreground text-sm mt-1 max-w-sm">
                  Não há horários bloqueados no momento.
                </p>
              </div>
            ) : (
              <div className="rounded-md border mt-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Período</TableHead>
                      <TableHead>Motivo (interno)</TableHead>
                      <TableHead>Mensagem ao cliente</TableHead>
                      <TableHead className="w-15"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blocks.map((block) => (
                      <TableRow key={block.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {formatRange(block.startDateTime, block.endDateTime)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {block.reason || <span className="italic text-muted-foreground/60">—</span>}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {block.clientMessage || <span className="italic text-muted-foreground/60">—</span>}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeletingId(block.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remover bloqueio</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover bloqueio?</AlertDialogTitle>
            <AlertDialogDescription>
              O horário voltará a ficar disponível para agendamentos imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete() }}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Sim, remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AuthGuard>
  )
}
