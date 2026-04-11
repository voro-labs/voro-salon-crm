"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useTransactions } from "@/hooks/use-transactions.hook"
import { TransactionDto, TransactionType, TransactionStatus, PaymentMethod } from "@/types/DTOs/financial.interface"
import { Button } from "@/components/ui/button"
import { FileEdit, Plus, Search, Tag, Settings, CreditCard, Banknote, Landmark, QrCode, TrendingUp, FileUp, Zap, Calendar, ChevronDown, ArrowRight } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

import { AuthGuard } from "@/components/auth/auth.guard"
import { PageHeader } from "@/components/ui/custom/page-header"
import { ExportMenu } from "@/components/ui/custom/export-menu"
import { PdfStatementImport } from "@/components/finance/pdf-statement-import"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useTransactionCategories } from "@/hooks/use-transaction-categories.hook"
import { useServiceRecords } from "@/hooks/use-service-records.hook"
import { ServiceRecordDto } from "@/types/DTOs/service-record.interface"
import { Loader2, MoreHorizontal, CheckCircle, Ban, Trash2 } from "lucide-react"
import { CurrencyInput } from "@/components/currency-input"
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

const getStatusBadge = (status: TransactionStatus) => {
  switch (status) {
    case TransactionStatus.Paid:
      return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-200">Pago</Badge>
    case TransactionStatus.Pending:
      return <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-200">Pendente</Badge>
    case TransactionStatus.Overdue:
      return <Badge className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border-rose-200">Atrasado</Badge>
    case TransactionStatus.Partial:
      return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-200">Parcial</Badge>
    case TransactionStatus.Cancelled:
      return <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">Cancelado</Badge>
    default:
      return <Badge variant="outline">Desconhecido</Badge>
  }
}

const getPaymentMethodIcon = (method: PaymentMethod) => {
  switch (method) {
    case PaymentMethod.Pix: return <QrCode className="h-4 w-4" />
    case PaymentMethod.CreditCard: return <CreditCard className="h-4 w-4" />
    case PaymentMethod.DebitCard: return <CreditCard className="h-4 w-4" />
    case PaymentMethod.Boleto: return <FileEdit className="h-4 w-4" />
    case PaymentMethod.Cash: return <Banknote className="h-4 w-4" />
    default: return <Landmark className="h-4 w-4" />
  }
}

const getPaymentMethodName = (method: PaymentMethod) => {
  switch (method) {
    case PaymentMethod.Pix: return "Pix"
    case PaymentMethod.CreditCard: return "Crédito"
    case PaymentMethod.DebitCard: return "Débito"
    case PaymentMethod.Boleto: return "Boleto"
    case PaymentMethod.Cash: return "Dinheiro"
    default: return "Outro"
  }
}

export default function FinancialPage() {
  const { transactions, isLoading, createTransaction, payTransaction, cancelTransaction, deleteTransaction, batchImport } = useTransactions()
  const { serviceRecords } = useServiceRecords()
  const { categories } = useTransactionCategories()
  const [searchTerm, setSearchTerm] = useState("")
  const [isPdfImportOpen, setIsPdfImportOpen] = useState(false)
  const [txPage, setTxPage] = useState(1)
  const [txPageSize, setTxPageSize] = useState(10)

  useEffect(() => { setTxPage(1) }, [searchTerm])

  // Auto Revenue State
  const [isAutoRevenueOpen, setIsAutoRevenueOpen] = useState(false)
  const [autoRevenueStartDate, setAutoRevenueStartDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd"))
  const [autoRevenueEndDate, setAutoRevenueEndDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [isGeneratingRevenue, setIsGeneratingRevenue] = useState(false)

  // Form State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modais de Ação
  const [selectedTx, setSelectedTx] = useState<TransactionDto | null>(null)
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false)
  const [txToCancel, setTxToCancel] = useState<TransactionDto | null>(null)
  const [txToDelete, setTxToDelete] = useState<TransactionDto | null>(null)

  // Form Pagamento
  const [payForm, setPayForm] = useState({
    paidAmount: 0,
    paymentDate: format(new Date(), "yyyy-MM-dd"),
    paymentMethod: "4",
    notes: ""
  })

  const [form, setForm] = useState({
    description: "",
    amount: 0,
    type: "2",
    categoryId: "none",
    dueDate: format(new Date(), "yyyy-MM-dd"),
    paymentMethod: "4",
    notes: ""
  })

  const resetForm = () => {
    setForm({
      description: "",
      amount: 0,
      type: "2",
      categoryId: "none",
      dueDate: format(new Date(), "yyyy-MM-dd"),
      paymentMethod: "4",
      notes: ""
    })
  }

  // Filtered service records for the selected period
  const filteredServiceRecords = (serviceRecords || []).filter((r) => {
    const d = new Date(r.serviceDate)
    const start = new Date(autoRevenueStartDate + "T00:00:00")
    const end = new Date(autoRevenueEndDate + "T23:59:59")
    return d >= start && d <= end
  })

  const autoRevenueTotalAmount = filteredServiceRecords.reduce((acc, r) => acc + r.amount, 0)

  const handleSetFullMonth = () => {
    const now = new Date()
    setAutoRevenueStartDate(format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd"))
    setAutoRevenueEndDate(format(new Date(now.getFullYear(), now.getMonth() + 1, 0), "yyyy-MM-dd"))
  }

  const handleGenerateRevenue = async () => {
    if (filteredServiceRecords.length === 0) {
      toast.error("Nenhum registro de serviço encontrado no período selecionado.")
      return
    }
    setIsGeneratingRevenue(true)
    try {
      const items = filteredServiceRecords.map((r) => ({
        description: r.description || r.serviceName || "Serviço concluído",
        amount: r.amount,
        type: 1 as const, // Income
        dueDate: r.serviceDate.includes("T") ? r.serviceDate : r.serviceDate + "T12:00:00.000Z",
        paymentMethod: 99 as const, // Other
        notes: r.appointmentId ? `Agendamento #${r.appointmentId.slice(0, 8)}` : undefined,
        dedupKey: r.id,
      }))
      const res = await batchImport(items)
      if (res.hasError) throw new Error(res.message || "Erro")
      const { imported, skipped } = res.data ?? { imported: 0, skipped: 0 }
      toast.success(
        `Receita gerada: ${imported} nova(s)${skipped > 0 ? `, ${skipped} já existia(m) e foram ignoradas` : ""}.`
      )
      setIsAutoRevenueOpen(false)
    } catch (err: any) {
      toast.error(err.message || "Falha ao gerar receitas.")
    } finally {
      setIsGeneratingRevenue(false)
    }
  }

  const handleOpenDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description) {
      toast.error("A descrição é obrigatória")
      return
    }
    const val = form.amount
    if (isNaN(val) || val <= 0) {
      toast.error("Insira um valor maior que 0")
      return
    }

    const date = form.dueDate
    if (!date) {
      toast.error("Insira uma data de vencimento válida")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await createTransaction({
        description: form.description,
        amount: val,
        type: parseInt(form.type) as TransactionType,
        categoryId: form.categoryId === "none" ? undefined : form.categoryId,
        dueDate: form.dueDate + "T12:00:00.000Z",
        paymentMethod: parseInt(form.paymentMethod) as PaymentMethod,
        notes: form.notes
      })

      if (res.hasError) throw new Error(res.message || "Erro")

      toast.success("Lançamento adicionado com sucesso!")
      setIsDialogOpen(false)
      resetForm()
    } catch (err: any) {
      toast.error(err.message || "Falha ao enviar transação.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenPayDialog = (tx: TransactionDto) => {
    setSelectedTx(tx)
    setPayForm({
      paidAmount: tx.amount - tx.paidAmount,
      paymentDate: format(new Date(), "yyyy-MM-dd"),
      paymentMethod: tx.paymentMethod.toString(),
      notes: ""
    })
    setIsPayDialogOpen(true)
  }

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTx) return
    const val = payForm.paidAmount
    if (isNaN(val) || val <= 0) {
      toast.error("Insira um valor maior que 0")
      return
    }

    const date = payForm.paymentDate
    if (!date) {
      toast.error("Insira uma data de pagamento válida")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await payTransaction(selectedTx.id, {
        id: selectedTx.id,
        paidAmount: selectedTx.paidAmount + val, // Somando com o que já foi pago
        paymentDate: payForm.paymentDate + "T12:00:00.000Z",
        paymentMethod: parseInt(payForm.paymentMethod) as PaymentMethod,
        notes: payForm.notes
      })
      if (res.hasError) throw new Error(res.message || "Erro")
      toast.success("Pagamento registrado com sucesso!")
      setIsPayDialogOpen(false)
    } catch (err: any) {
      toast.error(err.message || "Falha ao registrar pagamento.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelTransaction = async () => {
    if (!txToCancel) return
    setIsSubmitting(true)
    try {
      const res = await cancelTransaction(txToCancel.id)
      if (res.hasError) throw new Error(res.message || "Erro")
      toast.success("Lançamento cancelado.")
      setTxToCancel(null)
    } catch (err: any) {
      toast.error(err.message || "Não foi possível cancelar o lançamento.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteTransaction = async () => {
    if (!txToDelete) return
    setIsSubmitting(true)
    try {
      const res = await deleteTransaction(txToDelete.id)
      if (res.hasError) throw new Error(res.message || "Erro")
      toast.success("Lançamento apagado permanentemente.")
      setTxToDelete(null)
    } catch (err: any) {
      toast.error(err.message || "Não foi possível apagar o lançamento.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredTransactions = transactions?.filter(t =>
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const txTotalCount = filteredTransactions.length
  const txTotalPages = Math.max(1, Math.ceil(txTotalCount / txPageSize))
  const txSafePage = Math.min(txPage, txTotalPages)
  const paginatedTransactions = filteredTransactions.slice((txSafePage - 1) * txPageSize, txSafePage * txPageSize)

  // Calculando totais rápidos
  const totalReceitas = transactions?.filter(t => t.type === TransactionType.Income && t.status !== TransactionStatus.Cancelled).reduce((acc, t) => acc + t.amount, 0) || 0
  const totalDespesas = transactions?.filter(t => t.type === TransactionType.Expense && t.status !== TransactionStatus.Cancelled).reduce((acc, t) => acc + t.amount, 0) || 0
  const saldoPrevisto = totalReceitas - totalDespesas

  const now = new Date()
  const receitaMes = transactions?.filter(t => {
    if (t.type !== TransactionType.Income || t.status === TransactionStatus.Cancelled) return false
    const d = new Date(t.dueDate)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).reduce((acc, t) => acc + t.amount, 0) || 0

  return (
    <AuthGuard requiredRoles={["SalonOwner", "Owner"]}>
      <div className="flex flex-col gap-6 p-3 sm:p-6">
        <PageHeader
          title="Financeiro"
          description="Fluxo de caixa, despesas e receitas."
          action={
            <div className="flex flex-wrap justify-end items-center gap-2 w-full sm:w-auto">
              {/* Secundários */}
              <div className="flex items-center gap-2 w-full sm:w-auto order-2 sm:order-1">
                <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-none h-9">
                  <Link href="/finance/categories">
                    <Settings className="mr-1.5 h-3.5 w-3.5" />
                    Categorias
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none h-9"
                  onClick={() => setIsPdfImportOpen(true)}
                >
                  <FileUp className="mr-1.5 h-3.5 w-3.5" />
                  Importar PDF
                </Button>
                <ExportMenu
                  size="sm"
                  rows={filteredTransactions}
                  filename="financeiro"
                  className="flex-1 sm:flex-none h-9"
                  columns={[
                    { header: "Descrição", value: (t: any) => t.description },
                    { header: "Tipo", value: (t: any) => t.type === 1 ? "Receita" : "Despesa" },
                    { header: "Valor (R$)", value: (t: any) => Number(t.amount ?? 0).toFixed(2) },
                    { header: "Valor Pago (R$)", value: (t: any) => Number(t.paidAmount ?? 0).toFixed(2) },
                    { header: "Vencimento", value: (t: any) => format(new Date(t.dueDate), "dd/MM/yyyy") },
                    { header: "Pagamento", value: (t: any) => t.paymentDate ? format(new Date(t.paymentDate), "dd/MM/yyyy") : "" },
                    { header: "Status", value: (t: any) => ({ 1: "Pago", 2: "Pendente", 3: "Atrasado", 4: "Parcial", 5: "Cancelado" }[t.status as number] ?? "") },
                    { header: "Categoria", value: (t: any) => t.category?.name ?? "" },
                    { header: "Observações", value: (t: any) => t.notes ?? "" },
                  ]}
                />
              </div>

              {/* Primário */}
              <div className="flex items-center order-1 sm:order-2 w-full sm:w-auto">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={handleOpenDialog}
                      size="sm"
                      className="h-9 rounded-r-none border-r border-primary-foreground/20 bg-primary hover:bg-primary/90 flex-1 sm:flex-none"
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      Novo Lançamento
                    </Button>
                  </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Novo Lançamento</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="type">Tipo</Label>
                        <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                          <SelectTrigger id="type" className="w-full">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2">Saída (Despesa)</SelectItem>
                            <SelectItem value="1">Entrada (Ganho)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date">Vencimento / Data *</Label>
                        <Input
                          id="date"
                          type="date"
                          value={form.dueDate}
                          onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição *</Label>
                      <Input
                        id="description"
                        placeholder="Ex: Aluguel do mês, Faturamento diário..."
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        autoFocus
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="amount">Valor *</Label>
                        <CurrencyInput
                          id="amount"
                          value={form.amount}
                          onChange={(v) => setForm(p => ({ ...p, amount: v }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Categoria</Label>
                        <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                          <SelectTrigger id="category" className="w-full">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhuma</SelectItem>
                            {(categories || [])
                              .filter(c => c.type.toString() === form.type)
                              .map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paymentMethod">Método de Pagamento</Label>
                      <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v })}>
                        <SelectTrigger id="paymentMethod" className="w-full">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="6">Pix</SelectItem>
                          <SelectItem value="2">Cartão de Crédito</SelectItem>
                          <SelectItem value="3">Cartão de Débito</SelectItem>
                          <SelectItem value="1">Dinheiro</SelectItem>
                          <SelectItem value="5">Boleto</SelectItem>
                          <SelectItem value="7">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Criar Lançamento
                      </Button>
                    </div>
                  </form>
                </DialogContent>
                </Dialog>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="h-9 w-8 rounded-l-none px-0 bg-primary hover:bg-primary/90">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel>Adicionar receita</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleOpenDialog}>
                      <Plus className="mr-2 h-4 w-4" />
                      Lançamento manual
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsAutoRevenueOpen(true)}>
                      <Zap className="mr-2 h-4 w-4 text-amber-500" />
                      Gerar receita automática
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="min-w-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium">Receitas</CardTitle>
              <Banknote className="h-4 w-4 text-emerald-500 shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-emerald-600 truncate">{formatCurrency(totalReceitas)}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">Ganhos gerais</p>
            </CardContent>
          </Card>
          <Card className="min-w-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Despesas</CardTitle>
              <Banknote className="h-4 w-4 text-rose-500 shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-rose-600 truncate">{formatCurrency(totalDespesas)}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">Contas e gastos</p>
            </CardContent>
          </Card>
          <Card className="min-w-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Saldo Previsto</CardTitle>
              <Landmark className={`h-4 w-4 shrink-0 ${saldoPrevisto >= 0 ? 'text-primary' : 'text-rose-500'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-lg sm:text-2xl font-bold truncate ${saldoPrevisto >= 0 ? '' : 'text-rose-600'}`}>
                {formatCurrency(saldoPrevisto)}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">Balanço do pedido</p>
            </CardContent>
          </Card>
          <Card className="min-w-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Receita do Mês
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500 shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-blue-600 truncate">
                {formatCurrency(receitaMes)}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">
                {format(now, "MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="min-w-0 w-full overflow-hidden">
          <CardHeader className="pb-3 border-b">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-lg">Transações</CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar lançamento..."
                    className="w-full pl-8 h-10 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              {txTotalCount > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">{txTotalCount} registro{txTotalCount !== 1 ? "s" : ""}</p>
                    <span className="text-muted-foreground/40 text-sm">·</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-muted-foreground">Por página:</span>
                      <div className="flex items-center gap-1">
                        {[5, 10, 20, 25, 50].map((n) => (
                          <button
                            key={n}
                            onClick={() => { setTxPageSize(n); setTxPage(1) }}
                            className={`h-6 min-w-7 px-1.5 rounded text-xs font-medium transition-colors ${
                              txPageSize === n
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
                  {txTotalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={txSafePage === 1} onClick={() => setTxPage((p) => p - 1)}>Anterior</Button>
                      <span className="text-sm">Página {txSafePage} de {txTotalPages}</span>
                      <Button variant="outline" size="sm" disabled={txSafePage >= txTotalPages} onClick={() => setTxPage((p) => p + 1)}>Próxima</Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <div className="min-w-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[100px] pl-4">Vencimento</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Valor / Pago</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right pr-4">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          Carregando transações...
                        </TableCell>
                      </TableRow>
                    ) : filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          Nenhum lançamento encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedTransactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="pl-4 font-medium">
                            {format(new Date(tx.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-semibold">{tx.description}</span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                {getPaymentMethodIcon(tx.paymentMethod)}
                                {getPaymentMethodName(tx.paymentMethod)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {tx.category ? (
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Tag className="h-3.5 w-3.5" />
                                {tx.category.name}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm italic">Sem categoria</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className={`font-medium ${tx.type === TransactionType.Income ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {tx.type === TransactionType.Income ? '+' : '-'} {formatCurrency(tx.amount)}
                              </span>
                              {tx.paidAmount > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  Pago: {formatCurrency(tx.paidAmount)}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(tx.status)}
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Abrir menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => { }} disabled>
                                  <FileEdit className="mr-2 h-4 w-4" />
                                  Editar Lançamento
                                </DropdownMenuItem>
                                {tx.status !== TransactionStatus.Paid && tx.status !== TransactionStatus.Cancelled && (
                                  <DropdownMenuItem onClick={() => handleOpenPayDialog(tx)}>
                                    <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />
                                    Pagar / Dar Baixa
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                {tx.status !== TransactionStatus.Cancelled && (
                                  <DropdownMenuItem onClick={() => setTxToCancel(tx)}>
                                    <Ban className="mr-2 h-4 w-4 text-amber-500" />
                                    Cancelar Lançamento
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => setTxToDelete(tx)}>
                                  <Trash2 className="mr-2 h-4 w-4 text-rose-500" />
                                  Apagar Registro
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        {txTotalCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">{txTotalCount} registro{txTotalCount !== 1 ? "s" : ""}</p>
              <span className="text-muted-foreground/40 text-sm">·</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-muted-foreground">Por página:</span>
                <div className="flex items-center gap-1">
                  {[5, 10, 20, 25, 50].map((n) => (
                    <button
                      key={n}
                      onClick={() => { setTxPageSize(n); setTxPage(1) }}
                      className={`h-6 min-w-7 px-1.5 rounded text-xs font-medium transition-colors ${
                        txPageSize === n
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
            {txTotalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={txSafePage === 1}
                  onClick={() => setTxPage((p) => p - 1)}
                >
                  Anterior
                </Button>
                <span className="text-sm">Página {txSafePage} de {txTotalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={txSafePage >= txTotalPages}
                  onClick={() => setTxPage((p) => p + 1)}
                >
                  Próxima
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePaySubmit} className="space-y-4 pt-4">
            <div className="rounded-md bg-muted/50 p-3 mb-2 flex flex-col gap-1">
              <span className="text-sm font-semibold">{selectedTx?.description}</span>
              <span className="text-sm text-muted-foreground">Valor Restante: <strong className="text-foreground">{formatCurrency((selectedTx?.amount || 0) - (selectedTx?.paidAmount || 0))}</strong></span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payAmount">Valor a Pagar *</Label>
                <CurrencyInput
                  id="payAmount"
                  value={payForm.paidAmount}
                  onChange={(v) => setPayForm(p => ({ ...p, paidAmount: v }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payDate">Data do Pagto *</Label>
                <Input
                  id="payDate"
                  type="date"
                  value={payForm.paymentDate}
                  onChange={(e) => setPayForm(p => ({ ...p, paymentDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payMethod">Forma de Pagamento</Label>
              <Select value={payForm.paymentMethod} onValueChange={(v) => setPayForm(p => ({ ...p, paymentMethod: v }))}>
                <SelectTrigger id="payMethod" className="w-full">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">Pix</SelectItem>
                  <SelectItem value="2">Cartão de Crédito</SelectItem>
                  <SelectItem value="3">Cartão de Débito</SelectItem>
                  <SelectItem value="1">Dinheiro</SelectItem>
                  <SelectItem value="5">Boleto</SelectItem>
                  <SelectItem value="7">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payNotes">Anotações Add (opcional)</Label>
              <Input
                id="payNotes"
                placeholder="Ex: Comprovante Nº, Nome da conta..."
                value={payForm.notes}
                onChange={(e) => setPayForm(p => ({ ...p, notes: e.target.value }))}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar {(selectedTx?.type === 1) ? 'Recebimento' : 'Pagamento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!txToCancel} onOpenChange={(open) => !open && setTxToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente cancelar o lançamento "{txToCancel?.description}"? Ele perderá o valor de recebimento/pagamento nos relatórios.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleCancelTransaction(); }} disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />}
              Sim, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!txToDelete} onOpenChange={(open) => !open && setTxToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar Registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja apagar o lançamento "{txToDelete?.description}" permanentemente?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDeleteTransaction(); }} disabled={isSubmitting} className="bg-rose-600 hover:bg-rose-700">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Sim, apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PdfStatementImport
        open={isPdfImportOpen}
        onOpenChange={setIsPdfImportOpen}
        categories={categories || []}
        onImport={batchImport}
      />

      {/* Auto Revenue Dialog */}
      <Dialog open={isAutoRevenueOpen} onOpenChange={setIsAutoRevenueOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Gerar Receita Automática
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Gera receitas a partir dos agendamentos concluídos no período. Registros já importados são ignorados automaticamente.
            </p>

            {/* Period */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Período</Label>
                <button
                  type="button"
                  onClick={handleSetFullMonth}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Mês inteiro
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={autoRevenueStartDate}
                  onChange={(e) => setAutoRevenueStartDate(e.target.value)}
                  className="flex-1"
                />
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  type="date"
                  value={autoRevenueEndDate}
                  onChange={(e) => setAutoRevenueEndDate(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-lg border bg-muted/30 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/50">
                <span className="text-sm font-semibold">
                  {filteredServiceRecords.length} registro(s) encontrado(s)
                </span>
                <span className="text-sm font-bold text-emerald-600">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(autoRevenueTotalAmount)}
                </span>
              </div>
              {filteredServiceRecords.length === 0 ? (
                <div className="flex flex-col items-center py-8 gap-2 text-muted-foreground">
                  <Calendar className="h-8 w-8 opacity-40" />
                  <span className="text-sm">Nenhum serviço concluído neste período</span>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto divide-y">
                  {filteredServiceRecords.slice(0, 20).map((r) => (
                    <div key={r.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium truncate">{r.description || r.serviceName || "Serviço"}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(r.serviceDate), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      <span className="font-semibold text-emerald-600 shrink-0 ml-3">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(r.amount)}
                      </span>
                    </div>
                  ))}
                  {filteredServiceRecords.length > 20 && (
                    <div className="px-4 py-2 text-xs text-center text-muted-foreground">
                      + {filteredServiceRecords.length - 20} mais...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsAutoRevenueOpen(false)} disabled={isGeneratingRevenue}>
              Cancelar
            </Button>
            <Button
              onClick={handleGenerateRevenue}
              disabled={isGeneratingRevenue || filteredServiceRecords.length === 0}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {isGeneratingRevenue ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-2 h-4 w-4" />
              )}
              Gerar {filteredServiceRecords.length} Receita(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthGuard>
  )
}
