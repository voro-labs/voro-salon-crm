"use client"

/**
 * PdfStatementImport — Componente de importação de extrato bancário via PDF.
 *
 * Arquitetura (preparado para IA):
 *  - O parser de categorias usa regras por regex (CATEGORY_RULES).
 *  - Para adicionar IA futura, basta substituir `suggestCategory()` por uma
 *    chamada a um LLM/embedding endpoint, mantendo a mesma assinatura.
 *
 * Fluxo:
 *  1. Usuário arrasta/clica para fazer upload do PDF.
 *  2. PDF é lido client-side com pdfjs-dist (nunca enviado ao servidor).
 *  3. Texto extraído é parsado linha a linha em transações candidatas.
 *  4. Tela de revisão exibe as transações com edição inline.
 *  5. Usuário confirma → batch POST → API salva com deduplicação.
 */

import { useState, useCallback, useRef } from "react"
import {
  Upload, FileText, X, Check, AlertCircle,
  ChevronRight, RefreshCw, Loader2, Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { TransactionType, PaymentMethod, TransactionCategoryDto, BatchImportTransactionItemDto } from "@/types/DTOs/financial.interface"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedTransaction {
  id: string
  description: string
  amount: number
  type: TransactionType
  date: string          // ISO yyyy-MM-dd
  categoryId?: string
  notes?: string
  /** used to flag rows the user explicitly edited */
  edited?: boolean
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: TransactionCategoryDto[]
  onImport: (items: BatchImportTransactionItemDto[]) => Promise<{ hasError?: boolean; message?: string | null; data?: { imported: number; skipped: number } | null }>
}

// ---------------------------------------------------------------------------
// Category suggestion rules (READY FOR AI REPLACEMENT)
// To add AI: replace suggestCategory() with an API call.
// ---------------------------------------------------------------------------

interface CategoryRule {
  keywords: RegExp
  type: TransactionType
  label: string
}

const CATEGORY_RULES: CategoryRule[] = [
  { keywords: /ifood|uber\s*eats|rappi|delivery|restaurante|lanche|padaria|alimenta/i, type: TransactionType.Expense, label: "Alimentação" },
  { keywords: /uber|99|taxi|transfer|combustív|gasolina|etanol|posto|pedágio/i, type: TransactionType.Expense, label: "Transporte" },
  { keywords: /netflix|spotify|amazon|apple|youtube|disney|prime|assinatura/i, type: TransactionType.Expense, label: "Assinaturas" },
  { keywords: /farmácia|droga|consultório|médico|dentist|hospital|plano\s*saúde/i, type: TransactionType.Expense, label: "Saúde" },
  { keywords: /salário|pix\s*receb|transferência\s*rec|folha/i, type: TransactionType.Income, label: "Receita" },
  { keywords: /aluguel|condomínio|iptu|luz|água|energia|internet|claro|vivo|tim/i, type: TransactionType.Expense, label: "Moradia" },
  { keywords: /mercado|supermercado|hortifruti|carrefour|extra|pão de açúcar/i, type: TransactionType.Expense, label: "Supermercado" },
  { keywords: /salon|salão|beleza|estética|manicure|cabeleire/i, type: TransactionType.Income, label: "Faturamento Salão" },
]

function suggestCategory(
  description: string,
  categories: TransactionCategoryDto[]
): { categoryId?: string; type: TransactionType } {
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.test(description)) {
      // Try to match a real category by label
      const matched = categories.find(
        c => c.name.toLowerCase().includes(rule.label.toLowerCase()) && c.type === rule.type
      )
      return { categoryId: matched?.id, type: rule.type }
    }
  }
  return { type: TransactionType.Expense }
}

// ---------------------------------------------------------------------------
// PDF Text Extraction (client-side, no server upload)
// ---------------------------------------------------------------------------

async function extractTextFromPdf(file: File): Promise<string> {
  // Dynamically import pdfjs-dist to avoid SSR issues
  const pdfjsLib = await import("pdfjs-dist")

  // Set worker — use a more reliable strategy for Next.js
  if (typeof window !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString()
  }

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  let fullText = ""
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    fullText += content.items.map((item: any) => item.str).join(" ") + "\n"
  }

  return fullText
}

// ---------------------------------------------------------------------------
// Generic statement parser (works for Nubank, Itaú, Bradesco, Inter, Sicredi)
// Extracts: date (dd/mm/yyyy or dd-mm-yyyy), amount (R$ X,XX or plain), description
// ---------------------------------------------------------------------------

const DATE_RE = /(\d{2}[\/\-]\d{2}[\/\-]\d{4})/
const AMOUNT_RE = /R?\$?\s*([\d.,]+)/

function parseStatementText(
  text: string,
  categories: TransactionCategoryDto[]
): ParsedTransaction[] {
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean)
  const results: ParsedTransaction[] = []

  for (const line of lines) {
    const dateMatch = line.match(DATE_RE)
    if (!dateMatch) continue

    // Extract amount — look for numbers like 1.234,56 or 1234.56
    const amountMatches = [...line.matchAll(/[-−]?\s*(?:R\$)?\s*([\d.,]+(?:[.,]\d{2}))/g)]
    if (amountMatches.length === 0) continue

    const rawAmount = amountMatches[amountMatches.length - 1][1]
    // Normalise Brazilian (1.234,56) → 1234.56
    const normalised = rawAmount.replace(/\./g, "").replace(",", ".")
    const amount = Math.abs(parseFloat(normalised))
    if (isNaN(amount) || amount <= 0) continue

    // Description = line without date and amount
    let desc = line
      .replace(DATE_RE, "")
      .replace(/[-−]?\s*(?:R\$)?\s*[\d.,]+(?:[.,]\d{2})/g, "")
      .replace(/\s{2,}/g, " ")
      .trim()

    if (!desc || desc.length < 3) continue

    // Detect credit (positive balance or keyword)
    const isCredit = /crédito|credit|receb|pix\s*receb|ted\s*receb|pagto\s*receb/i.test(line)

    const [d, m, y] = dateMatch[1].split(/[\/\-]/)
    const isoDate = `${y}-${m}-${d}`

    const { categoryId, type } = suggestCategory(desc, categories)

    results.push({
      id: crypto.randomUUID(),
      description: desc.slice(0, 120),
      amount,
      type: isCredit ? TransactionType.Income : type,
      date: isoDate,
      categoryId,
    })
  }

  return results
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Step = "upload" | "review" | "done"

export function PdfStatementImport({ open, onOpenChange, categories, onImport }: Props) {
  const [step, setStep] = useState<Step>("upload")
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fileName, setFileName] = useState("")
  const [rows, setRows] = useState<ParsedTransaction[]>([])
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleClose = () => {
    onOpenChange(false)
    setStep("upload")
    setRows([])
    setFileName("")
    setImportResult(null)
  }

  const processFile = async (file: File) => {
    if (!file.name.endsWith(".pdf")) {
      toast.error("Selecione um arquivo PDF.")
      return
    }
    setIsProcessing(true)
    setFileName(file.name)
    try {
      const text = await extractTextFromPdf(file)
      const parsed = parseStatementText(text, categories)
      if (parsed.length === 0) {
        toast.warning("Nenhuma transação encontrada. Verifique o formato do PDF.")
        setIsProcessing(false)
        return
      }
      setRows(parsed)
      setStep("review")
    } catch (err: any) {
      toast.error("Erro ao ler o PDF: " + (err?.message ?? "Tente outro arquivo."))
    } finally {
      setIsProcessing(false)
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [categories]) // eslint-disable-line

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const updateRow = (id: string, patch: Partial<ParsedTransaction>) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch, edited: true } : r))
  }

  const removeRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id))
  }

  const handleSubmit = async () => {
    if (rows.length === 0) return
    setIsSubmitting(true)

    const items: BatchImportTransactionItemDto[] = rows.map(r => ({
      description: r.description,
      amount: r.amount,
      type: r.type,
      dueDate: r.date + "T12:00:00.000Z",
      categoryId: r.categoryId,
      paymentMethod: PaymentMethod.Other,
      notes: r.notes,
      dedupKey: `${r.date}|${r.description.toLowerCase().trim()}|${r.amount.toFixed(2)}`,
    }))

    try {
      const res = await onImport(items)
      if (res.hasError) throw new Error(res.message || "Erro na importação")
      setImportResult(res.data ?? { imported: items.length, skipped: 0 })
      setStep("done")
    } catch (err: any) {
      toast.error(err.message || "Falha ao importar transações.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalIncome = rows.filter(r => r.type === TransactionType.Income).reduce((s, r) => s + r.amount, 0)
  const totalExpense = rows.filter(r => r.type === TransactionType.Expense).reduce((s, r) => s + r.amount, 0)

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {step === "upload" && "Importar Extrato Bancário (PDF)"}
            {step === "review" && `Revisar Transações — ${fileName}`}
            {step === "done" && "Importação Concluída ✅"}
          </DialogTitle>
        </DialogHeader>

        {/* ── STEP 1: UPLOAD ── */}
        {step === "upload" && (
          <div className="flex flex-col gap-4 py-4">
            <div
              className={`
                relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 transition-colors cursor-pointer
                ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"}
              `}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={onFileChange}
              />
              {isProcessing ? (
                <>
                  <Loader2 className="h-12 w-12 text-primary animate-spin" />
                  <p className="text-muted-foreground">Processando PDF...</p>
                </>
              ) : (
                <>
                  <div className="rounded-full bg-primary/10 p-4">
                    <Upload className="h-10 w-10 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-base font-semibold">Arraste o PDF aqui ou clique para selecionar</p>
                    <p className="mt-1 text-sm text-muted-foreground">Suporte: Itaú, Bradesco, Nubank, Inter, Sicredi e outros</p>
                  </div>
                </>
              )}
            </div>

            <div className="rounded-lg border bg-muted/30 p-4 flex gap-3">
              <Sparkles className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <strong className="text-foreground">Processamento local:</strong> o arquivo PDF nunca é enviado ao servidor. Tudo é processado no seu navegador. As categorias são sugeridas automaticamente com base na descrição das transações.
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: REVIEW ── */}
        {step === "review" && (
          <>
            {/* Summary bar */}
            <div className="flex flex-wrap items-center gap-3 py-2">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-200">
                {rows.filter(r => r.type === TransactionType.Income).length} entradas · {formatCurrency(totalIncome)}
              </Badge>
              <Badge variant="outline" className="bg-rose-500/10 text-rose-700 border-rose-200">
                {rows.filter(r => r.type === TransactionType.Expense).length} saídas · {formatCurrency(totalExpense)}
              </Badge>
              <span className="text-xs text-muted-foreground ml-auto">
                <AlertCircle className="inline h-3 w-3 mr-1" />
                Edite ou remova antes de confirmar
              </span>
            </div>

            {/* Editable table */}
            <div className="flex-1 overflow-y-auto rounded-lg border">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/60 backdrop-blur">
                  <TableRow>
                    <TableHead className="w-25">Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-30">Valor</TableHead>
                    <TableHead className="w-25">Tipo</TableHead>
                    <TableHead className="w-40">Categoria</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} className={row.edited ? "bg-amber-500/5" : ""}>
                      <TableCell>
                        <Input
                          type="date"
                          value={row.date}
                          onChange={e => updateRow(row.id, { date: e.target.value })}
                          className="h-8 text-xs w-30"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.description}
                          onChange={e => updateRow(row.id, { description: e.target.value })}
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={row.amount}
                          onChange={e => updateRow(row.id, { amount: parseFloat(e.target.value) || 0 })}
                          className="h-8 text-xs w-27.5"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.type.toString()}
                          onValueChange={v => updateRow(row.id, { type: parseInt(v) as TransactionType })}
                        >
                          <SelectTrigger className="h-8 text-xs w-22.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Entrada</SelectItem>
                            <SelectItem value="2">Saída</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.categoryId ?? "none"}
                          onValueChange={v => updateRow(row.id, { categoryId: v === "none" ? undefined : v })}
                        >
                          <SelectTrigger className="h-8 text-xs w-37.5">
                            <SelectValue placeholder="Sem categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sem categoria</SelectItem>
                            {categories
                              .filter(c => c.type === row.type)
                              .map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-rose-500 hover:text-rose-700"
                          onClick={() => removeRow(row.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* ── STEP 3: DONE ── */}
        {step === "done" && importResult && (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="rounded-full bg-emerald-500/10 p-6">
              <Check className="h-14 w-14 text-emerald-500" />
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{importResult.imported} transações importadas</p>
              {importResult.skipped > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {importResult.skipped} duplicadas ignoradas automaticamente
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── FOOTER ── */}
        <DialogFooter className="pt-2">
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          )}
          {step === "review" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")} disabled={isSubmitting}>
                <RefreshCw className="mr-2 h-4 w-4" /> Trocar arquivo
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || rows.length === 0}>
                {isSubmitting
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importando...</>
                  : <><ChevronRight className="mr-2 h-4 w-4" /> Importar {rows.length} transações</>
                }
              </Button>
            </>
          )}
          {step === "done" && (
            <Button onClick={handleClose}>
              <Check className="mr-2 h-4 w-4" /> Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
