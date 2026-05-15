"use client"

import { useState } from "react"
import { MessageSquarePlus, Bug, Sparkles, Zap, HelpCircle, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface SupportPrechatProps {
  onStart: (category: string, isUrgent: boolean, title: string) => Promise<void>
}

const CATEGORIES = [
  { id: "Bug", label: "Bug / Erro", icon: Bug, description: "Algo não está funcionando corretamente" },
  { id: "Feature", label: "Sugestão de melhoria", icon: Sparkles, description: "Uma nova funcionalidade ou melhoria" },
  { id: "Other", label: "Outro", icon: HelpCircle, description: "Dúvida ou outro assunto" },
]

export function SupportPrechat({ onStart }: SupportPrechatProps) {
  const [category, setCategory] = useState<string | null>(null)
  const [isUrgent, setIsUrgent] = useState(false)
  const [title, setTitle] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!category || !title.trim()) return
    setLoading(true)
    try {
      await onStart(category, isUrgent, title.trim())
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto py-8 px-4">
      <div className="flex flex-col gap-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mx-auto">
          <MessageSquarePlus className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Fale com o suporte</h1>
        <p className="text-sm text-muted-foreground">Estamos aqui para ajudar. Conta pra gente o que está acontecendo.</p>
      </div>

      <div className="flex flex-col gap-3">
        <Label className="text-sm font-medium">Qual o tipo do seu contato?</Label>
        <div className="grid grid-cols-1 gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const selected = category === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                  selected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/40 hover:bg-accent/30"
                )}
              >
                <div className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className={cn("text-sm font-medium", selected && "text-primary")}>{cat.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{cat.description}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          É urgente?
        </Label>
        <div className="flex gap-2">
          {[
            { value: true, label: "Sim, é urgente" },
            { value: false, label: "Não, pode aguardar" },
          ].map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => setIsUrgent(opt.value)}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all",
                isUrgent === opt.value
                  ? opt.value
                    ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                    : "border-primary bg-primary/5 text-primary"
                  : "border-border hover:border-primary/40"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="support-title" className="text-sm font-medium">Dê um título curto para o assunto</Label>
        <Input
          id="support-title"
          placeholder="ex: Botão de agendamento não aparece"
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!category || !title.trim() || loading}
        className="w-full"
        size="lg"
      >
        {loading
          ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          : <ArrowRight className="mr-2 h-4 w-4" />
        }
        Conversar
      </Button>
    </div>
  )
}
