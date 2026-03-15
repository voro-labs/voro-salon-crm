"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import {
  AnamnesisFieldType,
  AnamnesisQuestion,
  AnamnesisSection,
  ANAMNESIS_SECTION_LABELS,
} from "@/types/anamnesis.types"

const fetcher = async (url: string) => {
  const result = await secureApiCall<any>(url, { method: "GET" })
  if (result.hasError) throw new Error(result.message || "Error")
  return result.data
}

interface AnamnesisFormProps {
  onChange: (responses: { questionId: string; value: string }[]) => void
}

export function AnamnesisForm({ onChange }: AnamnesisFormProps) {
  const { data: questions, isLoading } = useSWR(API_CONFIG.ENDPOINTS.ANAMNESIS + "/questions", fetcher)
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({
    [AnamnesisSection.ClientData]: true,
  })

  useEffect(() => {
    const formattedResponses = Object.entries(responses).map(([questionId, value]) => ({
      questionId,
      value,
    }))
    onChange(formattedResponses)
  }, [responses, onChange])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Carregando perguntas...</span>
      </div>
    )
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="p-4 text-center border rounded-lg border-dashed">
        <p className="text-sm text-muted-foreground">
          Nenhuma pergunta de anamnese configurada para este estabelecimento.
        </p>
      </div>
    )
  }

  const sections = Array.from(new Set(questions.map((q: AnamnesisQuestion) => q.section))) as AnamnesisSection[]
  sections.sort((a, b) => a - b)

  const handleResponseChange = (questionId: string, value: string) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }))
  }

  const toggleSection = (section: number) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const parseOptions = (optionsStr: string | null | undefined): string[] => {
    if (!optionsStr) return []
    try {
      const parsed = JSON.parse(optionsStr)
      return Array.isArray(parsed) ? parsed : [optionsStr]
    } catch {
      return optionsStr.split(",").map((s) => s.trim()).filter(Boolean)
    }
  }

  const renderField = (question: AnamnesisQuestion) => {
    const value = responses[question.id] || ""
    const options = parseOptions(question.options)

    switch (question.fieldType) {
      case AnamnesisFieldType.ShortText:
        return (
          <Input
            id={question.id}
            value={value}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            placeholder={question.placeholder || "Sua resposta..."}
          />
        )
      case AnamnesisFieldType.LongText:
        return (
          <Textarea
            id={question.id}
            value={value}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            placeholder={question.placeholder || "Detalhes..."}
            rows={3}
          />
        )
      case AnamnesisFieldType.Number:
        return (
          <Input
            id={question.id}
            type="number"
            value={value}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
          />
        )
      case AnamnesisFieldType.Boolean:
        return (
          <RadioGroup
            value={value}
            onValueChange={(v) => handleResponseChange(question.id, v)}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="true" id={`${question.id}-yes`} />
              <Label htmlFor={`${question.id}-yes`}>Sim</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="false" id={`${question.id}-no`} />
              <Label htmlFor={`${question.id}-no`}>Não</Label>
            </div>
          </RadioGroup>
        )
      case AnamnesisFieldType.SingleSelection:
        return (
          <Select value={value} onValueChange={(v) => handleResponseChange(question.id, v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma opção" />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt: string) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      case AnamnesisFieldType.MultipleSelection:
        const selectedOptions = value ? JSON.parse(value) : []
        return (
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
            {options.map((opt: string) => (
              <div key={opt} className="flex items-center space-x-2">
                <Checkbox
                  id={`${question.id}-${opt}`}
                  checked={selectedOptions.includes(opt)}
                  onCheckedChange={(checked) => {
                    let newSelected = [...selectedOptions]
                    if (checked) newSelected.push(opt)
                    else newSelected = newSelected.filter((o) => o !== opt)
                    handleResponseChange(question.id, JSON.stringify(newSelected))
                  }}
                />
                <Label htmlFor={`${question.id}-${opt}`} className="text-sm font-normal text-balance">
                  {opt}
                </Label>
              </div>
            ))}
          </div>
        )
      default:
        return <p className="text-xs text-muted-foreground">Campo do tipo {AnamnesisFieldType[question.fieldType]} em desenvolvimento.</p>
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {sections.map((section) => {
        const sectionQuestions = questions
          .filter((q: AnamnesisQuestion) => q.section === section)
          .sort((a: AnamnesisQuestion, b: AnamnesisQuestion) => a.order - b.order)
        const isExpanded = !!expandedSections[section]

        return (
          <Card key={section} className="border-none shadow-none bg-muted/30">
            <CardHeader
              className="p-3 cursor-pointer flex flex-row items-center justify-between"
              onClick={() => toggleSection(section)}
            >
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                {ANAMNESIS_SECTION_LABELS[section]}
              </CardTitle>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CardHeader>
            {isExpanded && (
              <CardContent className="p-4 pt-0 flex flex-col gap-4">
                {sectionQuestions.map((question: AnamnesisQuestion) => (
                  <div key={question.id} className="flex flex-col gap-2">
                    <Label htmlFor={question.id} className="text-sm font-semibold text-balance flex flex-wrap gap-1">
                      <span>{question.label}</span>
                      {question.isRequired && <span className="text-destructive">*</span>}
                    </Label>
                    {renderField(question)}
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}
