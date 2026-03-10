"use client"

import { useState } from "react"
import { useTransactionCategories } from "@/hooks/use-transaction-categories.hook"
import { TransactionCategoryDto, TransactionType } from "@/types/DTOs/financial.interface"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2, Tag, Loader2 } from "lucide-react"
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
  DialogTrigger,
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AuthGuard } from "@/components/auth/auth.guard"

export default function FinancialCategoriesPage() {
  const { categories, isLoading, createCategory, updateCategory, deleteCategory } = useTransactionCategories()
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<TransactionCategoryDto | null>(null)
  
  const [name, setName] = useState("")
  const [type, setType] = useState<string>("2") // Default para Expense
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<{id: string, name: string} | null>(null)

  const openNewDialog = () => {
    setEditingCategory(null)
    setName("")
    setType("2")
    setIsDialogOpen(true)
  }

  const openEditDialog = (category: TransactionCategoryDto) => {
    setEditingCategory(category)
    setName(category.name)
    setType(category.type.toString())
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("O nome da categoria é obrigatório.")
      return
    }

    setIsSubmitting(true)
    try {
      const parsedType = parseInt(type) as TransactionType
      if (editingCategory) {
        const res = await updateCategory(editingCategory.id, {
          id: editingCategory.id,
          name,
          type: parsedType,
          isActive: editingCategory.isActive
        })
        if (res.hasError) throw new Error(res.message || "Erro")
        toast.success("Categoria atualizada com sucesso.")
      } else {
        const res = await createCategory({
          name,
          type: parsedType
        })
        if (res.hasError) throw new Error(res.message || "Erro")
        toast.success("Categoria criada com sucesso.")
      }
      setIsDialogOpen(false)
    } catch (err: any) {
      toast.error(err.message || "Ocorreu um erro ao salvar a categoria.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!categoryToDelete) return
    setIsSubmitting(true)
    try {
      const res = await deleteCategory(categoryToDelete.id)
      if (res.hasError) throw new Error(res.message || "Erro")
      toast.success("Categoria excluída com sucesso.")
      setCategoryToDelete(null)
    } catch (err: any) {
      toast.error(err.message || "Não foi possível excluir.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthGuard requiredRoles={["Admin", "User"]}>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Categorias Financeiras</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie os tipos de despesas e receitas do seu salão.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Categoria</Label>
                <Input
                  id="name"
                  placeholder="Ex: Aluguel, Produtos, Pix Avulso..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select
                  value={type}
                  onValueChange={setType}
                  disabled={isSubmitting || !!editingCategory} // Ideal não mudar tipo depois de criada pra não quebrar relatórios
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">Saída (Despesa)</SelectItem>
                    <SelectItem value="1">Entrada (Ganho)</SelectItem>
                  </SelectContent>
                </Select>
                {!!editingCategory && (
                  <p className="text-xs text-muted-foreground">O tipo não pode ser alterado após a criação.</p>
                )}
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg">
            <Tag className="mr-2 h-5 w-5 text-primary" />
            Suas Categorias
          </CardTitle>
          <CardDescription>
            Categorias são usadas para classificar seus lançamentos no módulo financeiro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
              Carregando categorias...
            </div>
          ) : !categories || categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed mt-2">
              <div className="rounded-full bg-primary/10 p-3 mb-4">
                <Tag className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Nenhuma categoria encontrada</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-sm">
                Você ainda não cadastrou nenhuma categoria. Clique no botão acima para começar a organizar seu financeiro.
              </p>
              <Button onClick={openNewDialog} variant="outline" className="mt-4">
                Criar Primeira Categoria
              </Button>
            </div>
          ) : (
            <div className="rounded-md border mt-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>
                        {category.type === TransactionType.Income ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-200">
                            Entrada
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border-rose-200">
                            Saída
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => openEditDialog(category)}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setCategoryToDelete({ id: category.id, name: category.name })}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Excluir</span>
                          </Button>
                        </div>
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

      <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja apagar a categoria "{categoryToDelete?.name}"? Os lançamentos financeiros perderão o vínculo com ela.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete(); }} disabled={isSubmitting} className="bg-rose-600 hover:bg-rose-700">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AuthGuard>
  )
}
