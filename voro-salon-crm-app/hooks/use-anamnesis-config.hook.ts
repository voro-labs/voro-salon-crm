import { useState } from "react"
import useSWR, { mutate as globalMutate } from "swr"
import { Toast } from "toastify-react-native"
import { API_CONFIG, secureApiCall } from "../lib/api"
import { fetcher } from "../lib/fetcher"
import { AnamnesisFieldType, AnamnesisSection } from "../types/anamnesis.types"

const QUESTIONS_URL = API_CONFIG.ENDPOINTS.ANAMNESIS + "/questions"

export interface AnamnesisQuestionForm {
  label: string
  placeholder: string
  section: AnamnesisSection
  fieldType: AnamnesisFieldType
  options: string
  isRequired: boolean
  order: number
}

const DEFAULT_FORM: AnamnesisQuestionForm = {
  label: "",
  placeholder: "",
  section: AnamnesisSection.ClientData,
  fieldType: AnamnesisFieldType.ShortText,
  options: "",
  isRequired: false,
  order: 0,
}

export function useAnamnesisConfig() {
  const { data: questions, isLoading } = useSWR(QUESTIONS_URL, fetcher)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<any>(null)
  const [form, setForm] = useState<AnamnesisQuestionForm>(DEFAULT_FORM)
  const [isSaving, setIsSaving] = useState(false) // Changed from isSubmitting

  function openCreate() {
    setEditingQuestion(null)
    setForm({ ...DEFAULT_FORM, order: questions?.length || 0 })
    setDialogOpen(true)
  }

  function openEdit(q: any) {
    setEditingQuestion(q)
    setForm({
      label: q.label,
      placeholder: q.placeholder || "",
      section: q.section as AnamnesisSection,
      fieldType: q.fieldType as AnamnesisFieldType,
      options: q.options || "",
      isRequired: q.isRequired,
      order: q.order,
    })
    setDialogOpen(true)
  }

  async function saveQuestion(): Promise<boolean> {
    if (!form.label.trim()) {
      Toast.error("O rótulo da pergunta é obrigatório.") // Changed toast
      return false
    }

    setIsSaving(true) // Changed from setIsSubmitting
    try {
      const url = editingQuestion
        ? `${QUESTIONS_URL}/${editingQuestion.id}`
        : QUESTIONS_URL
      const method = editingQuestion ? "PUT" : "POST"

      const res = await secureApiCall(url, {
        method,
        body: JSON.stringify({ ...form, id: editingQuestion?.id }),
      })

      if (res.hasError) {
        Toast.error(res.message || "Erro ao salvar configuração.") // Changed toast
        return false
      }

      Toast.success("Configuração salva com sucesso!") // Changed toast
      setDialogOpen(false)
      globalMutate(QUESTIONS_URL) // Removed globalMutate
      return true
    } catch {
      Toast.error("Erro de conexão. Tente novamente.") // Changed toast
      return false
    } finally {
      setIsSaving(false) // Changed from setIsSubmitting
    }
  }

  async function deleteQuestion(id: string) {
    try {
      const res = await secureApiCall(`${QUESTIONS_URL}/${id}`, { method: "DELETE" })
      if (res.hasError) {
        Toast.error("Erro ao excluir pergunta.")
        return
      }
      Toast.success("Pergunta excluída!")
      globalMutate(QUESTIONS_URL)
    } catch {
      Toast.error("Erro de conexão.")
    }
  }

  async function importQuestions(file: File): Promise<void> {
    const reader = new FileReader()
    return new Promise((resolve) => {
      reader.onload = async (event) => {
        const content = event.target?.result as string
        try {
          let items: any[] = []

          if (file.name.endsWith(".json")) {
            items = JSON.parse(content)
          } else if (file.name.endsWith(".csv")) {
            const lines = content.split("\n")
            const headers = lines[0].split(",")
            items = lines
              .slice(1)
              .filter((l) => l.trim())
              .map((line) => {
                const values = line.split(",")
                const obj: any = {}
                headers.forEach((h, i) => {
                  const key = h.trim().toLowerCase()
                  let val: any = values[i]?.trim()
                  if (key === "section" || key === "fieldtype" || key === "order") val = parseInt(val)
                  if (key === "isrequired") val = val.toLowerCase() === "true"
                  if (key === "label") obj.label = val
                  else obj[key] = val
                })
                return obj
              })
          }

          if (items.length === 0) {
            Toast.error("Nenhum dado encontrado no arquivo.")
            resolve()
            return
          }

          setIsSaving(true)
          const res = await secureApiCall(`${QUESTIONS_URL}/bulk`, {
            method: "POST",
            body: JSON.stringify(items),
          })

          if (res.hasError) {
            Toast.error(res.message || "Erro ao importar perguntas.")
          } else {
            Toast.success(`${items.length} perguntas importadas com sucesso!`)
            globalMutate(QUESTIONS_URL)
          }
        } catch {
          Toast.error("Erro ao processar arquivo. Verifique o formato.")
        } finally {
          setIsSaving(false)
          resolve()
        }
      }
      reader.readAsText(file)
    })
  }

  return {
    questions,
    isLoading,
    dialogOpen,
    setDialogOpen,
    editingQuestion,
    form,
    setForm,
    isSaving,
    openCreate,
    openEdit,
    saveQuestion,
    deleteQuestion,
    importQuestions,
  }
}
