"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { 
  CheckCircle2, 
  Calendar, 
  Clock, 
  User, 
  Scissors, 
  MapPin, 
  Phone,
  ArrowLeft,
  Share2,
  Printer,
  ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AuthenticatedImage } from "@/components/ui/custom/authenticated-image"
import { ThemeToggle } from "@/components/theme-toggle"
import { apiCall, API_CONFIG, getAuthToken } from "@/lib/api"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"
import { toast } from "sonner"

interface ReceiptData {
  id: string
  clientName: string
  serviceName: string
  employeeName?: string
  scheduledDateTime: string
  durationMinutes: number
  amount: number
  status: string
  tenant: {
    id: string
    name: string
    slug: string
    contactPhone?: string
    logoUrl?: string
    primaryColor?: string
    secondaryColor?: string
    themeMode?: string
  }
  dayAgenda: Array<{
    startTime: string
    endTime: string
    isAvailable: boolean
  }>
}

export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<ReceiptData | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (getAuthToken()) {
      router.replace("/")
      return
    }
  }, [router])

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        const res = await apiCall<ReceiptData>(`${API_CONFIG.ENDPOINTS.PUBLIC_RECEIPT}/${id}`)
        if (res.hasError) {
          toast.error("Agendamento não encontrado.")
          return
        }
        setData(res.data ?? null)
      } catch (err) {
        console.error("Error fetching receipt:", err)
        toast.error("Erro ao carregar comprovante.")
      } finally {
        setLoading(false)
      }
    }

    fetchReceipt()
  }, [id, router])

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground animate-pulse">Carregando comprovante...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background p-4 text-center">
        <div className="rounded-full bg-muted p-6 mb-6">
          <Calendar className="h-12 w-12 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold">Comprovante não encontrado</h1>
        <p className="text-muted-foreground mt-2 max-w-xs">
          O link pode ter expirado ou o agendamento foi removido.
        </p>
        <Button className="mt-8" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>
    )
  }

  const primaryColor = data.tenant.primaryColor || "#000000"
  const dateObj = new Date(data.scheduledDateTime)

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Agendamento - ${data.tenant.name}`,
        text: `Meu agendamento de ${data.serviceName} no salão ${data.tenant.name}`,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success("Link copiado para a área de transferência!")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 pb-12">
      {/* Header Sticky */}
      <div className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b">
        <div className="mx-auto max-w-md flex h-16 items-center justify-between px-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="font-semibold text-sm">Comprovante de Agendamento</span>
          <ThemeToggle />
        </div>
      </div>

      <main className="mx-auto max-w-md px-4 mt-6 flex flex-col gap-6">
        {/* Success Header */}
        <div className="flex flex-col items-center text-center gap-2 mb-2">
          <div className="rounded-full bg-emerald-500/10 p-3 mb-2 animate-in zoom-in duration-500">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Tudo certo!</h1>
          <p className="text-muted-foreground text-sm">
            Seu agendamento em <span className="font-semibold text-foreground">{data.tenant.name}</span> foi confirmado.
          </p>
        </div>

        {/* Receipt Card */}
        <Card className="border-none shadow-xl overflow-hidden relative">
          {/* Decorative receipt edge top */}
          <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-primary/50 via-primary to-primary/50" />
          
          <CardHeader className="bg-muted/30 pb-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl border bg-background flex items-center justify-center overflow-hidden shadow-sm">
                {data.tenant.logoUrl ? (
                  <AuthenticatedImage 
                    src={data.tenant.logoUrl} 
                    alt={data.tenant.name} 
                    className="h-full w-full object-cover" 
                  />
                ) : (
                  <Scissors className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold">{data.tenant.name}</span>
                <div className="flex items-center text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 mr-1" />
                  <span>{data.tenant.slug}.vorosalon.com</span>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 flex flex-col gap-5">
            {/* Details Grid */}
            <div className="grid grid-cols-1 gap-6">
              <div className="flex items-start gap-4">
                <div className="mt-1 rounded-lg bg-primary/10 p-2">
                  <Scissors className="h-5 w-5 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Serviço</span>
                  <span className="text-base font-bold">{data.serviceName}</span>
                  <span className="text-sm text-muted-foreground">{data.durationMinutes} minutos · R$ {data.amount.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="mt-1 rounded-lg bg-primary/10 p-2">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Data</span>
                  <span className="text-base font-bold">
                    {format(dateObj, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="mt-1 rounded-lg bg-primary/10 p-2">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Horário</span>
                  <span className="text-base font-bold">
                    {format(dateObj, "HH:mm")}
                  </span>
                </div>
              </div>

              {data.employeeName && (
                <div className="flex items-start gap-4">
                  <div className="mt-1 rounded-lg bg-primary/10 p-2">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Profissional</span>
                    <span className="text-base font-bold">{data.employeeName}</span>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Client Info */}
            <div className="bg-muted/20 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-medium">Cliente</span>
                <span className="text-sm font-bold">{data.clientName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-medium">Status</span>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 capitalize">
                  {data.status === "Confirmed" ? "Confirmado" : data.status}
                </Badge>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" /> Compartilhar
              </Button>
              <Button variant="outline" size="icon" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>

          {/* Decorative receipt edge bottom */}
          <div className="h-4 w-full bg-[radial-gradient(circle,transparent_8px,white_8px)] bg-size-[24px_24px] dark:bg-[radial-gradient(circle,transparent_8px,#09090b_8px)] -mt-2 mb-0" />
        </Card>

        {/* Dynamic Context: Agenda of the Day */}
        <div className="flex flex-col gap-4 mt-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" /> Agenda do Dia
            </h2>
            <span className="text-xs text-muted-foreground font-medium">
              {format(dateObj, "dd/MM/yyyy")}
            </span>
          </div>

          <div className="bg-background rounded-2xl p-4 shadow-sm border border-border/50">
            <p className="text-xs text-muted-foreground mb-4">
              Acompanhe a disponibilidade do salão para hoje. Seu horário está destacado abaixo.
            </p>
            
            <div className="grid grid-cols-4 gap-2">
              {data.dayAgenda.map((slot, i) => {
                const slotTime = slot.startTime.split("T")[1].substring(0, 5)
                const isMySlot = slotTime === format(dateObj, "HH:mm")
                
                return (
                  <div 
                    key={i}
                    className={`
                      flex flex-col items-center justify-center py-2 px-1 rounded-lg text-[10px] font-bold border transition-all
                      ${isMySlot 
                        ? "bg-primary text-primary-foreground border-primary scale-110 shadow-md ring-2 ring-primary/20 z-10" 
                        : slot.isAvailable 
                          ? "bg-emerald-500/5 text-emerald-600 border-emerald-100" 
                          : "bg-rose-500/5 text-rose-400 border-rose-100 opacity-60"
                      }
                    `}
                  >
                    <span>{slotTime}</span>
                    <span className="text-[8px] font-medium mt-0.5">
                      {isMySlot ? "O SEU" : slot.isAvailable ? "Livre" : "Ocupado"}
                    </span>
                  </div>
                )
              })}
            </div>

            <Button 
              variant="link" 
              className="w-full mt-4 text-xs h-8 text-primary"
              onClick={() => router.push(`/booking/${data.tenant.slug}`)}
            >
              Fazer outro agendamento <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>

        {/* Footer Support */}
        <div className="text-center mt-4">
          <p className="text-xs text-muted-foreground">
            Dúvidas? Entre em contato com o salão:
          </p>
          <div className="flex items-center justify-center gap-4 mt-3">
            {data.tenant.contactPhone && (
              <a 
                href={`tel:${data.tenant.contactPhone}`}
                className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                <Phone className="h-4 w-4" /> Ligar
              </a>
            )}
            <a 
               href={`https://wa.me/${data.tenant.contactPhone?.replace(/\D/g, "")}`}
               target="_blank"
               className="flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:underline"
            >
              <Share2 className="h-4 w-4" /> WhatsApp
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
