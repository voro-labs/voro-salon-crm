"use client"

import { useState } from "react"
import Link from "next/link"
import { useTransactions } from "@/hooks/use-transactions.hook"
import { TransactionDto, TransactionType, TransactionStatus, PaymentMethod } from "@/types/DTOs/financial.interface"
import { Button } from "@/components/ui/button"
import { FileEdit, Plus, Search, Tag, Settings, CreditCard, Banknote, Landmark, QrCode } from "lucide-react"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

import { AuthGuard } from "@/components/auth/auth.guard"
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
  const { transactions, isLoading, createTransaction, updateTransaction, payTransaction, cancelTransaction, deleteTransaction } = useTransactions()
  const { categories } = useTransactionCategories()
  const [searchTerm, setSearchTerm] = useState("")

  // Form State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

   // Modais de Ação
  const [selectedTx, setSelectedTx] = useState<TransactionDto | null>(null)
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [txToCancel, setTxToCancel] = useState<TransactionDto | null>(null)
  const [txToDelete, setTxToDelete] = useState<TransactionDto | null>(null)

  // Form Pagamento
  const [payForm, setPayForm] = useState({
    paidAmount: 0,
    paymentDate: format(new Date(), "yyyy-MM-dd"),
    paymentMethod: "5",
    notes: ""
  })

  const [form, setForm] = useState({
    description: "",
    amount: 0,
    type: "2",
    categoryId: "none",
    dueDate: format(new Date(), "yyyy-MM-dd"),
    paymentMethod: "5",
    notes: ""
  })

  const resetForm = () => {
    setForm({
      description: "",
      amount: 0,
      type: "2",
      categoryId: "none",
      dueDate: format(new Date(), "yyyy-MM-dd"),
      paymentMethod: "5",
      notes: ""
    })
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

    setIsSubmitting(true)
    try {
      const res = await createTransaction({
        description: form.description,
        amount: val,
        type: parseInt(form.type) as TransactionType,
        categoryId: form.categoryId === "none" ? undefined : form.categoryId,
        dueDate: new Date(form.dueDate).toISOString(),
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

    setIsSubmitting(true)
    try {
      const res = await payTransaction(selectedTx.id, {
        id: selectedTx.id,
        paidAmount: selectedTx.paidAmount + val, // Somando com o que já foi pago
        paymentDate: new Date(payForm.paymentDate).toISOString(),
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

  // Calculando totais rápidos
  const totalReceitas = transactions?.filter(t => t.type === TransactionType.Income && t.status !== TransactionStatus.Cancelled).reduce((acc, t) => acc + t.amount, 0) || 0
  const totalDespesas = transactions?.filter(t => t.type === TransactionType.Expense && t.status !== TransactionStatus.Cancelled).reduce((acc, t) => acc + t.amount, 0) || 0
  const saldoPrevisto = totalReceitas - totalDespesas

  return (
    <AuthGuard requiredRoles={["Admin", "User"]}>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
            <p className="text-muted-foreground mt-2">
              Acompanhe o fluxo de caixa, despesas e receitas do mês.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/finance/categories">
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Categorias
              </Button>
            </Link>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenDialog}>
                  <Plus className="mr-2 h-4 w-4" />
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
                      <Label htmlFor="date">Vencimento / Data</Label>
                      <Input
                        id="date"
                        type="date"
                        value={form.dueDate}
                        onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
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
                      <Label htmlFor="amount">Valor</Label>
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
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receitas Previstas</CardTitle>
              <Banknote className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalReceitas)}</div>
              <p className="text-xs text-muted-foreground mt-1">Ganhos cadastrados gerais</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesas Cadastradas</CardTitle>
              <Banknote className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600">{formatCurrency(totalDespesas)}</div>
              <p className="text-xs text-muted-foreground mt-1">Contas a pagar e gastos</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Previsto</CardTitle>
              <Landmark className={`h-4 w-4 ${saldoPrevisto >= 0 ? 'text-primary' : 'text-rose-500'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${saldoPrevisto >= 0 ? '' : 'text-rose-600'}`}>
                {formatCurrency(saldoPrevisto)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Balanço geral do período</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3 border-b">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg">Transações</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar lançamento..."
                  className="w-full pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-md">
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
                    filteredTransactions.map((tx) => (
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
                            <DropdownMenuItem onClick={() => {}} disabled>
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
          </CardContent>
        </Card>
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
                <Label htmlFor="payAmount">Valor a Pagar</Label>
                <CurrencyInput
                  id="payAmount"
                  value={payForm.paidAmount}
                  onChange={(v) => setPayForm(p => ({ ...p, paidAmount: v }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payDate">Data do Pagto</Label>
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
    </AuthGuard>
  )
}
