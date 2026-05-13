"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

// Numeric field type constants matching AnamnesisFieldType enum (public API context)
const FieldType = {
  ShortText: 1,
  LongText: 2,
  Number: 3,
  SingleSelection: 4,
  MultipleSelection: 5,
  Boolean: 6,
  Signature: 7,
  ImageUpload: 8,
} as const

function parseOptions(raw?: string): string[] {
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return raw.split(",").map(s => s.trim()).filter(Boolean) }
}

export interface PublicQuestion {
  id: string
  label: string
  placeholder?: string
  fieldType: number
  options?: string
  isRequired: boolean
  section: number
  order: number
}

interface QuestionFieldProps {
  question: PublicQuestion
  value: string
  onChange: (v: string) => void
}

export function QuestionField({ question, value, onChange }: QuestionFieldProps) {
  const opts = parseOptions(question.options)

  switch (question.fieldType) {
    case FieldType.LongText:
      return (
        <Textarea
          placeholder={question.placeholder ?? ""}
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={3}
          className="resize-none"
        />
      )
    case FieldType.Number:
      return (
        <Input
          type="number"
          placeholder={question.placeholder ?? ""}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      )
    case FieldType.Boolean:
      return (
        <div className="flex gap-3">
          {["Sim", "Não"].map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt === "Sim" ? "true" : "false")}
              className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                (opt === "Sim" ? "true" : "false") === value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )
    case FieldType.SingleSelection:
      return (
        <div className="flex flex-col gap-2">
          {opts.map(opt => (
            <label key={opt} className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="radio"
                name={question.id}
                value={opt}
                checked={value === opt}
                onChange={() => onChange(opt)}
                className="accent-primary h-4 w-4"
              />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      )
    case FieldType.MultipleSelection: {
      const selected: string[] = value
        ? ((): string[] => { try { return JSON.parse(value) } catch { return [] } })()
        : []
      const toggle = (opt: string) => {
        const next = selected.includes(opt)
          ? selected.filter(s => s !== opt)
          : [...selected, opt]
        onChange(JSON.stringify(next))
      }
      return (
        <div className="flex flex-col gap-2">
          {opts.map(opt => (
            <label key={opt} className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="accent-primary h-4 w-4"
              />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      )
    }
    default:
      return (
        <Input
          placeholder={question.placeholder ?? ""}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      )
  }
}
