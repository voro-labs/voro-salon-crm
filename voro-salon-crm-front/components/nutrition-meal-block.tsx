"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GripVertical, X, UtensilsCrossed } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TimePicker } from "@/components/ui/custom/time-picker"
import type { MealPlanMealDto } from "@/types/DTOs/meal-plan-meal.interface"
import { MealPeriodEnum } from "@/types/Enums/mealPeriodEnum.enum"

interface MealBlockProps {
  meals: MealPlanMealDto[]
  onMealsChange: (meals: MealPlanMealDto[]) => void
}

const periodOptions = [
  { value: String(MealPeriodEnum.Unspecified), label: "Desconhecido" },
  { value: String(MealPeriodEnum.Breakfast), label: "Café da Manhã" },
  { value: String(MealPeriodEnum.MorningSnack), label: "Lanche da Manhã" },
  { value: String(MealPeriodEnum.Lunch), label: "Almoço" },
  { value: String(MealPeriodEnum.AfternoonSnack), label: "Lanche da Tarde" },
  { value: String(MealPeriodEnum.Dinner), label: "Jantar" },
  { value: String(MealPeriodEnum.Supper), label: "Ceia" },
]

export function MealBlock({ meals, onMealsChange }: MealBlockProps) {
  const removeMeal = (index: number) => {
    const updated = meals.filter((_, i) => i !== index).map((meal, i) => ({ ...meal, order: i + 1 }))
    onMealsChange(updated)
  }

  const updateMeal = (index: number, field: keyof MealPlanMealDto, value: string | number) => {
    const updated = [...meals]
    updated[index] = { ...updated[index], [field]: value }
    onMealsChange(updated)
  }

  return (
    <>
      {meals.length === 0 ? (
        <Card className="border-2 border-dashed border-border/50 bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <UtensilsCrossed className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma refeição adicionada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {meals.map((meal, index) => (
            <Card key={meal.id || index} className="bg-background">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1 cursor-grab">
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-sm">
                        {periodOptions.find((p) => p.value === String(meal.period))?.label || "Refeição"}
                      </CardTitle>
                      {meal.time && <p className="text-xs text-muted-foreground mt-1">{meal.time}</p>}
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeMeal(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor={`period-${index}`} className="text-xs">
                      Período
                    </Label>
                    <Select
                      value={String(meal.period || "")}
                      onValueChange={(value) => updateMeal(index, "period", Number(value) as MealPeriodEnum)}
                    >
                      <SelectTrigger id={`period-${index}`} className="h-9">
                        <SelectValue placeholder="Escolha o período" />
                      </SelectTrigger>
                      <SelectContent>
                        {periodOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`time-${index}`} className="text-xs">
                      Horário
                    </Label>
                    <TimePicker
                      id={`time-${index}`}
                      value={meal.time || ""}
                      onChange={(value) => updateMeal(index, "time", value)}
                      placeholder="hh:mm"
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`description-${index}`} className="text-xs">
                    Descrição dos Alimentos *
                  </Label>
                  <Textarea
                    id={`description-${index}`}
                    placeholder="Ex: 2 ovos mexidos, 2 fatias de pão integral, 1 banana..."
                    rows={3}
                    value={meal.description || ""}
                    onChange={(e) => updateMeal(index, "description", e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`quantity-${index}`} className="text-xs">
                    Quantidade Total (opcional)
                  </Label>
                  <Input
                    id={`quantity-${index}`}
                    placeholder="Ex: Aproximadamente 500 calorias"
                    value={meal.quantity || ""}
                    onChange={(e) => updateMeal(index, "quantity", e.target.value)}
                    className="h-9"
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`notes-${index}`} className="text-xs">
                    Observações
                  </Label>
                  <Textarea
                    id={`notes-${index}`}
                    placeholder="Dicas de preparo, substituições possíveis..."
                    rows={2}
                    value={meal.notes || ""}
                    onChange={(e) => updateMeal(index, "notes", e.target.value)}
                    className="text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
