"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Plus, UtensilsCrossed } from "lucide-react"
import { MealBlock } from "./nutrition-meal-block"
import type { MealPlanDayDto } from "@/types/DTOs/meal-plan-day.interface"
import { DayOfWeekEnum } from "@/types/Enums/dayOfWeekEnum.enum"
import { MealPeriodEnum } from "@/types/Enums/mealPeriodEnum.enum"
import type { MealPlanMealDto } from "@/types/DTOs/meal-plan-meal.interface"

interface NutritionDayBlockProps {
  day: MealPlanDayDto
  onRemove: () => void
  onChange: (day: MealPlanDayDto) => void
}

const dayOptions = [
  { value: String(DayOfWeekEnum.Monday), label: "Segunda-feira" },
  { value: String(DayOfWeekEnum.Tuesday), label: "Terça-feira" },
  { value: String(DayOfWeekEnum.Wednesday), label: "Quarta-feira" },
  { value: String(DayOfWeekEnum.Thursday), label: "Quinta-feira" },
  { value: String(DayOfWeekEnum.Friday), label: "Sexta-feira" },
  { value: String(DayOfWeekEnum.Saturday), label: "Sábado" },
  { value: String(DayOfWeekEnum.Sunday), label: "Domingo" },
]

export function NutritionDayBlock({ day, onRemove, onChange }: NutritionDayBlockProps) {
  const meals = day.meals || []

  const addMeal = () => {
    const newMeal: MealPlanMealDto = {
      id: null,
      mealPlanDayId: day.id || null,
      time: "",
      period: MealPeriodEnum.Unspecified,
      description: "",
      quantity: "",
      notes: "",
      order: meals.length + 1,
    }
    onChange({ ...day, meals: [...meals, newMeal] })
  }

  const updateMeals = (updatedMeals: MealPlanMealDto[]) => {
    onChange({ ...day, meals: updatedMeals })
  }

  return (
    <Card className="bg-muted/30">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary shrink-0" />
            Dia Alimentar
          </CardTitle>
          <Button type="button" size="sm" onClick={onRemove} variant="destructive" className="w-full sm:w-auto text-xs sm:text-sm">
            Remover Dia
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Dia da Semana *
          </Label>
          <Select
            value={String(day.dayOfWeek || "")}
            onValueChange={(value) => onChange({ ...day, dayOfWeek: Number(value) as DayOfWeekEnum })}
          >
            <SelectTrigger className="h-12 text-base">
              <SelectValue placeholder="Escolha o dia" />
            </SelectTrigger>
            <SelectContent>
              {dayOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <UtensilsCrossed className="h-4 w-4 shrink-0" />
              <span>Refeições do Dia</span>
            </div>
            <Button type="button" size="sm" onClick={addMeal} variant="outline" className="w-full sm:w-auto text-xs sm:text-sm bg-transparent">
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              Adicionar Refeição
            </Button>
          </div>

          {meals.length === 0 ? (
            <Card className="border-2 border-dashed border-border/50 bg-muted/20">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <UtensilsCrossed className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm font-medium mb-1">Nenhuma refeição adicionada</p>
                <p className="text-xs text-muted-foreground mb-3">Clique para adicionar a primeira refeição</p>
                <Button type="button" size="sm" onClick={addMeal} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Refeição
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <MealBlock meals={meals} onMealsChange={updateMeals} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
