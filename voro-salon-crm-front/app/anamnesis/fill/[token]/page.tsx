"use client"

import { useState, useEffect, use } from "react"
import {
  CheckCircle2,
  FileText,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { apiCall } from "@/lib/api"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"
import { toast } from "sonner"
import { ThemeToggle } from "@/components/ui/custom/theme-toggle"
import { SignaturePad } from "@/components/ui/custom/signature-pad"
import { QuestionField } from "@/components/features/anamnesis/question-field"
import type { PublicQuestion } from "@/components/features/anamnesis/question-field"

const FieldType = {
  Signature: 7,
  ImageUpload: 8,
} as const

const SECTION_LABELS: Record<number, string> = {
  1: "Dados do Cliente",
  2: "Queixa Principal",
  3: "Histórico Capilar",
  4: "Rotina Capilar",
  5: "Saúde Geral",
  6: "Uso de Medicamentos",
  7: "Estilo de Vida",
  8: "Histórico Familiar",
  9: "Avaliação do Couro Cabeludo",
  10: "Diagnóstico Capilar",
  11: "Protocolo de Tratamento",
}

interface SheetData {
  clientName: string
  tenantName: string
  expiresAt?: string
  questions: PublicQuestion[]
  alreadyFilled: boolean
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AnamnesisFilPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [sheet, setSheet] = useState<SheetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({})
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)

  useEffect(() => {
    apiCall<SheetData>(`/public/anamnesis/fill/${token}`)
      .then(res => {
        if (res.hasError || !res.data) { setError("Link inválido ou expirado. Solicite um novo link ao profissional."); return }
        if (res.data.alreadyFilled) { setSubmitted(true) }
        setSheet(res.data)
        // All sections start expanded
        const sections = Array.from(new Set(res.data.questions.map(q => q.section)))
        setExpandedSections(Object.fromEntries(sections.map(s => [s, true])))
      })
      .catch(() => setError("Erro ao carregar documento. Tente novamente."))
      .finally(() => setLoading(false))
  }, [token])

  const setResponse = (id: string, value: string) =>
    setResponses(prev => ({ ...prev, [id]: value }))

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!sheet) return
    const required = sheet.questions.filter(q => q.isRequired && q.fieldType !== FieldType.Signature && q.fieldType !== FieldType.ImageUpload)
    const missing = required.filter(q => !responses[q.id]?.trim())
    if (missing.length > 0) { toast.error(`Preencha os campos obrigatórios: ${missing.map(q => q.label).join(", ")}`); return }
    if (!signatureDataUrl) { toast.error("Por favor, assine o documento antes de confirmar."); return }

    const signatureData = signatureDataUrl
    const responseList = sheet.questions
      .filter(q => q.fieldType !== FieldType.Signature && q.fieldType !== FieldType.ImageUpload)
      .map(q => ({ questionId: q.id, value: responses[q.id] ?? "" }))

    setSubmitting(true)
    try {
      const res = await apiCall(`/public/anamnesis/fill/${token}`, {
        method: "POST",
        body: JSON.stringify({ responses: responseList, signatureData }),
      })
      if (res.hasError) { toast.error(res.message || "Erro ao enviar. Tente novamente."); return }
      setSubmitted(true)
      toast.success("Ficha preenchida e assinada!")
    } catch { toast.error("Erro de conexão. Tente novamente.") }
    finally { setSubmitting(false) }
  }

  // ── States ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando ficha...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-background p-6 text-center">
      <div className="rounded-full bg-destructive/10 p-6 mb-4"><AlertCircle className="h-12 w-12 text-destructive" /></div>
      <h1 className="text-xl font-bold">Link Inválido</h1>
      <p className="text-muted-foreground mt-2 max-w-xs text-sm">{error}</p>
    </div>
  )

  if (!sheet) return null

  if (submitted) return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-background p-6 text-center">
      <div className="rounded-full bg-emerald-500/10 p-6 mb-4 animate-in zoom-in duration-500">
        <CheckCircle2 className="h-14 w-14 text-emerald-500" />
      </div>
      <h1 className="text-2xl font-bold">Ficha Enviada!</h1>
      <p className="text-muted-foreground mt-2 max-w-xs text-sm">
        Obrigado, <strong>{sheet.clientName}</strong>! Sua ficha foi preenchida e assinada com sucesso.
      </p>
      <Badge variant="outline" className="mt-4 text-emerald-600 border-emerald-200 bg-emerald-50">
        Ficha registrada ✓
      </Badge>
    </div>
  )

  const sections = Array.from(new Set(sheet.questions.map(q => q.section))).sort((a, b) => a - b)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b">
        <div className="mx-auto max-w-lg flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">Ficha de Anamnese</span>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <main className="mx-auto max-w-lg px-4 mt-6 flex flex-col gap-5">
        {/* Info */}
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold">Preencha sua Ficha</h1>
          <p className="text-sm text-muted-foreground">
            {sheet.tenantName} · {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
          {sheet.expiresAt && (
            <p className="text-xs text-amber-600 mt-1">
              Link válido até {format(new Date(sheet.expiresAt), "dd/MM/yyyy 'às' HH:mm")}
            </p>
          )}
        </div>

        {/* Client card */}
        <Card className="border-none shadow-md">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-base">
              {sheet.clientName[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-sm">{sheet.clientName}</p>
              <p className="text-xs text-muted-foreground">Cliente</p>
            </div>
          </CardContent>
        </Card>

        {/* Questions by section */}
        {sections.map(section => {
          const qs = sheet.questions
            .filter(q => q.section === section && q.fieldType !== FieldType.Signature && q.fieldType !== FieldType.ImageUpload)
            .sort((a, b) => a.order - b.order)
          if (qs.length === 0) return null
          const expanded = expandedSections[section] !== false

          return (
            <Card key={section} className="border-none shadow-md overflow-hidden">
              <CardHeader
                className="p-4 py-3 flex flex-row items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))}
              >
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {SECTION_LABELS[section] ?? `Seção ${section}`}
                </CardTitle>
                {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </CardHeader>
              {expanded && (
                <CardContent className="p-4 pt-0 flex flex-col gap-5">
                  {qs.map(q => (
                    <div key={q.id} className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium">
                        {q.label}
                        {q.isRequired && <span className="text-destructive ml-0.5">*</span>}
                      </label>
                      <QuestionField question={q} value={responses[q.id] ?? ""} onChange={v => setResponse(q.id, v)} />
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          )
        })}

        {/* Signature */}
        <Card className="border-none shadow-md">
          <CardHeader className="p-4 py-3">
            <CardTitle className="text-sm font-semibold">Assinatura</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-muted-foreground mb-3">
              Assine dentro do campo abaixo confirmando que as informações são verdadeiras.
            </p>
            <SignaturePad
              onSign={setSignatureDataUrl}
              onClear={() => setSignatureDataUrl(null)}
            />
          </CardContent>
        </Card>

        {/* Terms */}
        <p className="text-xs text-muted-foreground text-center px-2">
          Ao enviar, confirmo que as informações fornecidas são verdadeiras e autorizo o profissional
          a utilizá-las para fins de avaliação e tratamento.
        </p>

        {/* Submit */}
        <Button size="lg" className="w-full" disabled={!signatureDataUrl || submitting} onClick={handleSubmit}>
          {submitting
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
            : <><CheckCircle2 className="mr-2 h-4 w-4" /> Confirmar e Enviar Ficha</>}
        </Button>
      </main>
    </div>
  )
}
