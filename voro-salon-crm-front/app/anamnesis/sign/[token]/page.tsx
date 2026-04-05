"use client"

import { useState, useEffect, use, useRef, useCallback } from "react"
import {
  CheckCircle2,
  FileText,
  Pen,
  Trash2,
  ArrowLeft,
  Loader2,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { apiCall, API_CONFIG } from "@/lib/api"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"
import { toast } from "sonner"
import { ThemeToggle } from "@/components/theme-toggle"

interface QuestionAnswer {
  label: string
  value: string
}

interface SheetData {
  id: string
  clientName: string
  tenantName: string
  date: string
  diagnosis?: string
  treatmentProtocol?: string
  questions: QuestionAnswer[]
  alreadySigned: boolean
  expiresAt?: string
}

export default function AnamnesisSignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [sheet, setSheet] = useState<SheetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [signing, setSigning] = useState(false)
  const [signed, setSigned] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const fetchSheet = async () => {
      try {
        const res = await apiCall<SheetData>(`/public/anamnesis/${token}`)
        if (res.hasError || !res.data) {
          setError("Link inválido ou expirado. Solicite um novo link ao profissional.")
          return
        }
        setSheet(res.data)
        if (res.data.alreadySigned) setSigned(true)
      } catch {
        setError("Erro ao carregar documento. Tente novamente.")
      } finally {
        setLoading(false)
      }
    }
    fetchSheet()
  }, [token])

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    e.preventDefault()
    setIsDrawing(true)
    lastPos.current = getCanvasPos(e, canvas)
  }, [])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    e.preventDefault()
    const ctx = canvas.getContext("2d")
    if (!ctx || !lastPos.current) return

    const pos = getCanvasPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = "#1a1a1a"
    ctx.lineWidth = 2.5
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.stroke()
    lastPos.current = pos
    setHasSignature(true)
  }, [isDrawing])

  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
    lastPos.current = null
  }, [])

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const handleSign = async () => {
    const canvas = canvasRef.current
    if (!canvas || !hasSignature) {
      toast.error("Por favor, assine o documento antes de confirmar.")
      return
    }

    const signatureData = canvas.toDataURL("image/png")
    setSigning(true)
    try {
      const res = await apiCall(`/public/anamnesis/${token}/sign`, {
        method: "POST",
        body: JSON.stringify({ signatureData }),
      })

      if (res.hasError) {
        toast.error("Erro ao assinar documento. Tente novamente.")
        return
      }
      setSigned(true)
      toast.success("Documento assinado com sucesso!")
    } catch {
      toast.error("Erro ao enviar assinatura.")
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando documento...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background p-6 text-center">
        <div className="rounded-full bg-destructive/10 p-6 mb-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="text-xl font-bold">Link Inválido</h1>
        <p className="text-muted-foreground mt-2 max-w-xs text-sm">{error}</p>
      </div>
    )
  }

  if (!sheet) return null

  if (signed) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background p-6 text-center">
        <div className="rounded-full bg-emerald-500/10 p-6 mb-4 animate-in zoom-in duration-500">
          <CheckCircle2 className="h-14 w-14 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-bold">Documento Assinado!</h1>
        <p className="text-muted-foreground mt-2 max-w-xs text-sm">
          A ficha de anamnese de <strong>{sheet.clientName}</strong> em{" "}
          <strong>{sheet.tenantName}</strong> foi assinada com sucesso.
        </p>
        <Badge variant="outline" className="mt-4 text-emerald-600 border-emerald-200 bg-emerald-50">
          Assinatura registrada ✓
        </Badge>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 pb-16">
      {/* Header */}
      <div className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b">
        <div className="mx-auto max-w-lg flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">Assinatura Digital</span>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <main className="mx-auto max-w-lg px-4 mt-6 flex flex-col gap-6">
        {/* Info Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold">Ficha de Anamnese</h1>
          <p className="text-sm text-muted-foreground">
            {sheet.tenantName} · {format(new Date(sheet.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
          {sheet.expiresAt && (
            <p className="text-xs text-amber-600 mt-1">
              Link válido até {format(new Date(sheet.expiresAt), "dd/MM/yyyy 'às' HH:mm")}
            </p>
          )}
        </div>

        {/* Client info */}
        <Card className="border-none shadow-md">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-base">
              {sheet.clientName[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-sm">{sheet.clientName}</p>
              <p className="text-xs text-muted-foreground">Cliente</p>
            </div>
          </CardContent>
        </Card>

        {/* Q&A */}
        {sheet.questions.length > 0 && (
          <Card className="border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Respostas da Ficha
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pt-0">
              {sheet.questions.map((qa, i) => (
                <div key={i}>
                  {i > 0 && <Separator className="mb-4" />}
                  <p className="text-xs font-semibold text-muted-foreground mb-1">{qa.label}</p>
                  <p className="text-sm">{qa.value || "—"}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {sheet.diagnosis && (
          <Card className="border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Diagnóstico / Protocolo
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex flex-col gap-3 text-sm">
              {sheet.diagnosis && <p><span className="font-medium">Diagnóstico:</span> {sheet.diagnosis}</p>}
              {sheet.treatmentProtocol && <p><span className="font-medium">Protocolo:</span> {sheet.treatmentProtocol}</p>}
            </CardContent>
          </Card>
        )}

        {/* Signature Canvas */}
        <Card className="border-none shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Pen className="h-4 w-4 text-primary" /> Assinatura do Cliente
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={clearCanvas} className="h-7 text-xs gap-1">
                <Trash2 className="h-3.5 w-3.5" /> Limpar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground mb-3">
              Assine dentro do campo abaixo usando o dedo ou mouse.
            </p>
            <div className="relative rounded-xl border-2 border-dashed border-primary/30 bg-white overflow-hidden touch-none">
              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                className="w-full h-45 cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!hasSignature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-muted-foreground/40 text-sm select-none">Assine aqui</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Terms */}
        <p className="text-xs text-muted-foreground text-center px-4">
          Ao assinar, confirmo que as informações fornecidas na ficha de anamnese são verdadeiras
          e concordo com o protocolo de tratamento proposto.
        </p>

        {/* Submit */}
        <Button
          size="lg"
          className="w-full"
          disabled={!hasSignature || signing}
          onClick={handleSign}
        >
          {signing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Assinando...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Confirmar e Assinar Documento
            </>
          )}
        </Button>
      </main>
    </div>
  )
}
