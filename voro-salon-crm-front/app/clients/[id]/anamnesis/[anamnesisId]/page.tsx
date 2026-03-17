"use client"

import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import useSWR from "swr"
import { 
  ArrowLeft, 
  Printer, 
  User, 
  Calendar, 
  ClipboardList, 
  Stethoscope,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  PenTool,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { API_CONFIG } from "@/lib/api"
import { AuthGuard } from "@/components/auth/auth.guard"
import { fetcher } from "@/lib/fetcher"
import { 
  AnamnesisSheet, 
  AnamnesisQuestion, 
  AnamnesisSection, 
  ANAMNESIS_SECTION_LABELS,
  AnamnesisFieldType
} from "@/types/anamnesis.types"
import { useState } from "react"

export default function AnamnesisDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string
  const anamnesisId = params.anamnesisId as string

  const { data: anamnesis, isLoading: loadingSheet } = useSWR<AnamnesisSheet>(
    `${API_CONFIG.ENDPOINTS.ANAMNESIS}/${anamnesisId}`, 
    fetcher
  )

  const { data: questions, isLoading: loadingQuestions } = useSWR<AnamnesisQuestion[]>(
    `${API_CONFIG.ENDPOINTS.ANAMNESIS}/questions`, 
    fetcher
  )

  const { data: client } = useSWR(
    `${API_CONFIG.ENDPOINTS.CLIENTS}/${clientId}`, 
    fetcher
  )

  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({})

  const toggleSection = (section: number) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  if (loadingSheet || loadingQuestions) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-lg font-medium">Carregando detalhes da ficha...</span>
      </div>
    )
  }

  if (!anamnesis) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
        <h2 className="text-xl font-bold">Ficha não encontrada</h2>
        <Button onClick={() => router.back()}>Voltar</Button>
      </div>
    )
  }

  const sectionsInForm = Array.from(new Set(questions?.map(q => q.section) || [])) as AnamnesisSection[]
  sectionsInForm.sort((a, b) => a - b)

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <AuthGuard>
      <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto print:p-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="shrink-0">
              <Link href={`/clients/${clientId}`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-balance">Ficha de Anamnese</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Detalhes da avaliação capilar</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="h-9 text-xs sm:text-sm flex-1 sm:flex-none">
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-sm border-none bg-primary/5">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">Cliente</p>
                <p className="text-lg font-bold truncate">{client?.name || "Carregando..."}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-none bg-muted/40">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data da Avaliação</p>
                <p className="text-lg font-bold">{formatDate(anamnesis.date)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-none bg-muted/40">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Stethoscope className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Profissional</p>
                <p className="text-lg font-bold">Voro Labs</p> 
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Diagnostic Summary */}
        {(anamnesis.diagnosis || anamnesis.treatmentProtocol) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:block">
            {anamnesis.diagnosis && (
              <Card className="border-none shadow-sm bg-amber-50 dark:bg-amber-950/20 print:mb-4">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Diagnóstico
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{anamnesis.diagnosis}</p>
                </CardContent>
              </Card>
            )}
            {anamnesis.treatmentProtocol && (
              <Card className="border-none shadow-sm bg-blue-50 dark:bg-blue-950/20">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Protocolo Recomendado
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{anamnesis.treatmentProtocol}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Main Content (Responses) */}
        <div className="flex flex-col gap-4 print:gap-2">
          {sectionsInForm.map((section) => {
            const sectionQuestions = questions?.filter(q => q.section === section)
              .sort((a, b) => a.order - b.order) || []
            
            const sectionResponses = sectionQuestions.map(q => {
              const resp = anamnesis.responses.find(r => r.questionId === q.id)
              return { question: q, response: resp }
            }).filter(item => item.response && item.response.value)

            if (sectionResponses.length === 0) return null

            const isExpanded = expandedSections[section] !== false // Default expanded

            return (
              <Card key={section} className="border-border/50 shadow-none bg-card print:border-none print:shadow-none">
                <CardHeader 
                  className="p-4 py-3 flex flex-row items-center justify-between cursor-pointer print:cursor-default hover:bg-muted/30 transition-colors print:p-2"
                  onClick={() => toggleSection(section)}
                >
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                      {ANAMNESIS_SECTION_LABELS[section]}
                    </CardTitle>
                  </div>
                  <div className="print:hidden">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="p-4 pt-0 print:p-2">
                    <div className="grid grid-cols-1 gap-y-4 gap-x-8 md:grid-cols-2 print:grid-cols-1">
                      {sectionResponses.map(({ question, response }) => {
                        let displayValue = response?.value || "-"
                        
                        // Parse multiselect
                        if (question.fieldType === AnamnesisFieldType.MultipleSelection) {
                          try {
                            const parsed = JSON.parse(displayValue)
                            if (Array.isArray(parsed)) {
                              displayValue = parsed.join(", ")
                            }
                          } catch {}
                        }
                        
                        // Handle boolean
                        if (question.fieldType === AnamnesisFieldType.Boolean) {
                          displayValue = displayValue === "true" ? "Sim" : displayValue === "false" ? "Não" : displayValue
                        }

                        return (
                          <div key={question.id} className="flex flex-col gap-1 border-b border-border/40 pb-2 md:border-none md:pb-0 print:border-b print:pb-1 min-w-0">
                            <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground/80 text-balance">{question.label}</span>
                            <span className="text-sm font-medium text-pretty">{displayValue}</span>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>

        {/* Evidence section */}
        {anamnesis.evidences && anamnesis.evidences.length > 0 && (
          <Card className="border-border/50 shadow-none">
            <CardHeader className="p-4 py-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  Evidências e Fotos
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {anamnesis.evidences.map((ev, idx) => (
                  <div key={idx} className="group relative aspect-square rounded-lg overflow-hidden border bg-muted">
                    <img 
                      src={ev.url} 
                      alt={ev.description || `Evidência ${idx + 1}`} 
                      className="object-cover w-full h-full transition-transform group-hover:scale-110"
                    />
                    {ev.description && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        {ev.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Signatures */}
        {anamnesis.signatures && anamnesis.signatures.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 print:mt-12">
            {anamnesis.signatures.map((sig, idx) => (
              <div key={idx} className="flex flex-col items-center gap-3">
                <div className="w-full h-32 border-b-2 border-muted-foreground/30 flex items-center justify-center bg-muted/5 rounded-t-lg">
                  {sig.signatureData ? (
                    <img src={sig.signatureData} alt="Assinatura" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <PenTool className="h-8 w-8 text-muted-foreground/20" />
                  )}
                </div>
                <div className="text-center">
                  <p className="font-bold text-sm uppercase">{sig.type === 1 ? "Assinatura do Cliente" : "Assinatura do Profissional"}</p>
                  <p className="text-[10px] text-muted-foreground italic">Assinado digitalmente em {formatDate(anamnesis.date)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer for print */}
        <div className="hidden print:flex flex-col items-center justify-center mt-20 text-center gap-2">
          <Separator className="w-64" />
          <p className="text-[10px] text-muted-foreground">
            Documento gerado pelo sistema Voro Salon CRM em {formatDate(new Date().toISOString())}
          </p>
        </div>
      </div>
    </AuthGuard>
  )
}
