"use client"

import Link from "next/link"
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  GripVertical,
  Loader2,
  Settings2,
  HelpCircle,
  Upload,
  FileJson,
  FileSpreadsheet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { AuthGuard } from "@/components/auth/auth.guard"
import { AnamnesisFieldType, AnamnesisSection, ANAMNESIS_SECTION_LABELS } from "@/types/anamnesis.types"
import { useAnamnesisConfig } from "@/hooks/use-anamnesis-config.hook"

function downloadTemplate(format: "json" | "csv") {
  const templateData = [
    {
      label: "Exemplo de Pergunta Texto",
      placeholder: "Digite aqui...",
      section: 1,
      fieldType: 1,
      options: "",
      isRequired: true,
      order: 0,
    },
    {
      label: "Exemplo de Seleção",
      placeholder: "Selecione uma opção",
      section: 2,
      fieldType: 4,
      options: "Opção A, Opção B, Opção C",
      isRequired: false,
      order: 1,
    },
  ]

  let content = ""
  let mimeType = ""
  const fileName = `template_anamnese.${format}`

  if (format === "json") {
    content = JSON.stringify(templateData, null, 2)
    mimeType = "application/json"
  } else {
    const headers = "label,placeholder,section,fieldType,options,isRequired,order"
    const rows = templateData.map(
      (item) =>
        `"${item.label}","${item.placeholder}",${item.section},${item.fieldType},"${item.options}",${item.isRequired},${item.order}`
    )
    content = [headers, ...rows].join("\n")
    mimeType = "text/csv"
  }

  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function AnamnesisConfigPage() {
  const {
    questions,
    isLoading,
    dialogOpen,
    setDialogOpen,
    editingQuestion,
    form,
    setForm,
    isSubmitting,
    openCreate,
    openEdit,
    saveQuestion,
    deleteQuestion,
    importQuestions,
  } = useAnamnesisConfig()

  const sections = Object.entries(ANAMNESIS_SECTION_LABELS).map(([key, label]) => ({
    value: parseInt(key) as AnamnesisSection,
    label,
  }))

  const fieldTypes: { value: AnamnesisFieldType; label: string }[] = [
    { value: AnamnesisFieldType.ShortText, label: "Texto Curto" },
    { value: AnamnesisFieldType.LongText, label: "Texto Longo" },
    { value: AnamnesisFieldType.Number, label: "Número" },
    { value: AnamnesisFieldType.SingleSelection, label: "Seleção (Única)" },
    { value: AnamnesisFieldType.MultipleSelection, label: "Múltipla Escolha" },
    { value: AnamnesisFieldType.Boolean, label: "Sim/Não" },
    { value: AnamnesisFieldType.Signature, label: "Assinatura" },
    { value: AnamnesisFieldType.ImageUpload, label: "Upload de Imagem" },
  ]

  return (
    <AuthGuard requiredRoles={["Admin"]}>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="shrink-0">
              <Link href="/settings">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">Configurar Anamnese</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Gerencie as perguntas da ficha</p>
            </div>
          </div>
          <div className="flex flex-col xs:flex-row items-stretch sm:items-center gap-2 sm:ml-auto">
            <div className="flex items-center border rounded-lg p-1 bg-muted/30 overflow-x-auto no-scrollbar justify-center">
              <span className="text-[10px] font-bold uppercase px-2 text-muted-foreground whitespace-nowrap">Templates:</span>
              <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2" onClick={() => downloadTemplate("json")}>
                <FileJson className="mr-1 h-3 w-3" />
                JSON
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2" onClick={() => downloadTemplate("csv")}>
                <FileSpreadsheet className="mr-1 h-3 w-3" />
                CSV
              </Button>
            </div>

            <div className="flex gap-2">
              <input
                type="file"
                id="import-file"
                accept=".json,.csv"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    await importQuestions(file)
                    e.target.value = ""
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none h-9 text-xs sm:text-sm"
                onClick={() => document.getElementById("import-file")?.click()}
                disabled={isSubmitting}
              >
                <Upload className="mr-2 h-4 w-4" />
                Importar
              </Button>
              <Button size="sm" className="flex-1 sm:flex-none h-9 text-xs sm:text-sm" onClick={openCreate} disabled={isSubmitting}>
                <Plus className="mr-2 h-4 w-4" />
                Nova
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 w-full animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : !questions || questions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <Settings2 className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium text-foreground">Nenhuma pergunta configurada</h3>
              <p className="mb-6 text-sm text-muted-foreground max-w-xs">
                Crie perguntas personalizadas para coletar informações importantes durante as avaliações dos clientes.
              </p>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeira Pergunta
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-8">
            {sections.map((section) => {
              const sectionQuestions = questions.filter((q: any) => q.section === section.value)
              if (sectionQuestions.length === 0) return null

              return (
                <div key={section.value} className="flex flex-col gap-4">
                  <h2 className="text-lg font-bold flex items-center gap-2 text-primary">
                    <span className="w-1 h-6 bg-primary rounded-full" />
                    {section.label}
                  </h2>
                  <div className="flex flex-col gap-3">
                    {sectionQuestions.sort((a: any, b: any) => a.order - b.order).map((q: any) => (
                      <div
                        key={q.id}
                        className="group flex items-center justify-between p-4 rounded-xl border border-border bg-card transition-all hover:border-primary/50 hover:shadow-sm"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <GripVertical className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-sm sm:text-base text-foreground text-balance">{q.label}</span>
                              {q.isRequired && (
                                <span className="text-[9px] sm:text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold uppercase whitespace-nowrap">
                                  Obrigatório
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                              <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                                <HelpCircle className="h-3 w-3" />
                                {fieldTypes.find((t) => t.value === q.fieldType)?.label || "Desconhecido"}
                              </span>
                              {q.options && (
                                <span className="text-[10px] sm:text-xs text-muted-foreground border-l pl-3">
                                  {q.options.split(",").length} opções
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(q)}>
                            <Edit2 className="h-4 w-4 text-muted-foreground hover:text-primary" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir pergunta?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Isso removerá esta pergunta de todas as futuras fichas de anamnese.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteQuestion(q.id)} className="bg-red-600 text-white">
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingQuestion ? "Editar Pergunta" : "Nova Pergunta"}</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => { e.preventDefault(); saveQuestion() }}
              className="flex flex-col gap-4 py-4"
            >
              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="label">Título / Pergunta *</Label>
                  <Input
                    id="label"
                    placeholder="Ex: Você possui alguma alergia?"
                    value={form.label}
                    onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="section">Seção</Label>
                    <Select
                      value={form.section.toString()}
                      onValueChange={(v) => setForm((p) => ({ ...p, section: parseInt(v) as AnamnesisSection }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sections.map((s) => (
                          <SelectItem key={s.value} value={s.value.toString()}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="type">Tipo de Resposta</Label>
                    <Select
                      value={form.fieldType.toString()}
                      onValueChange={(v) => setForm((p) => ({ ...p, fieldType: parseInt(v) as AnamnesisFieldType }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value.toString()}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="placeholder">Dica / Exemplo (Placeholder)</Label>
                  <Input
                    id="placeholder"
                    placeholder="Ex: Descreva aqui suas alergias..."
                    value={form.placeholder}
                    onChange={(e) => setForm((p) => ({ ...p, placeholder: e.target.value }))}
                  />
                </div>

                {(form.fieldType === AnamnesisFieldType.SingleSelection ||
                  form.fieldType === AnamnesisFieldType.MultipleSelection) && (
                  <div className="flex flex-col gap-2 p-3 bg-muted/50 rounded-lg border border-border">
                    <Label htmlFor="options">Opções (separadas por vírgula)</Label>
                    <Textarea
                      id="options"
                      placeholder="Opção 1, Opção 2, Opção 3"
                      value={form.options}
                      onChange={(e) => setForm((p) => ({ ...p, options: e.target.value }))}
                    />
                    <p className="text-[10px] text-muted-foreground uppercase">Importante: use vírgula para separar as opções.</p>
                  </div>
                )}

                <div className="flex items-center gap-2 py-2">
                  <input
                    type="checkbox"
                    id="required"
                    checked={form.isRequired}
                    onChange={(e) => setForm((p) => ({ ...p, isRequired: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="required" className="cursor-pointer">Resposta obrigatória?</Label>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="order">Ordem de exibição</Label>
                  <Input
                    id="order"
                    type="number"
                    value={form.order}
                    onChange={(e) => setForm((p) => ({ ...p, order: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <DialogFooter className="mt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingQuestion ? "Atualizar" : "Criar Pergunta"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  )
}
