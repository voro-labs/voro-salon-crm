"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Calendar, ChevronDown, ChevronUp } from "lucide-react"
import { NutritionDayBlock } from "./nutrition-day-block"
import type { MealPlanDayDto } from "@/types/DTOs/meal-plan-day.interface"
import { DayOfWeekEnum } from "@/types/Enums/dayOfWeekEnum.enum"
import type { MealPlanDto } from "@/types/DTOs/meal-plan.interface"

interface NutritionWeekBlockProps {
  meal: MealPlanDto
  days?: MealPlanDayDto[]
  onChange: (days: MealPlanDayDto[]) => void
}

const dayOptions = [
  { value: DayOfWeekEnum.Monday, label: "Segunda-feira" },
  { value: DayOfWeekEnum.Tuesday, label: "Terça-feira" },
  { value: DayOfWeekEnum.Wednesday, label: "Quarta-feira" },
  { value: DayOfWeekEnum.Thursday, label: "Quinta-feira" },
  { value: DayOfWeekEnum.Friday, label: "Sexta-feira" },
  { value: DayOfWeekEnum.Saturday, label: "Sábado" },
  { value: DayOfWeekEnum.Sunday, label: "Domingo" },
]

export function NutritionWeekBlock({ meal, days = [], onChange }: NutritionWeekBlockProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const addDay = () => {
    const usedDays = days.map((d) => d.dayOfWeek)
    const availableDay = dayOptions.find((d) => !usedDays.includes(d.value))

    if (!availableDay) {
      alert("Todos os dias da semana já foram adicionados")
      return
    }

    const newDay: MealPlanDayDto = {
      id: null,
      mealPlanId: meal.id || null,
      dayOfWeek: availableDay.value,
      meals: [],
    }
    onChange([...days, newDay])
  }

  const removeDay = (dayIndex: number) => {
    onChange(days.filter((_, i) => i !== dayIndex))
  }

  const updateDay = (dayIndex: number, updatedDay: MealPlanDayDto) => {
    const updated = [...days]
    updated[dayIndex] = updatedDay
    onChange(updated)
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 shrink-0"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
              <span className="truncate">Dias da Semana</span>
            </CardTitle>
            <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
              ({days.length} {days.length === 1 ? "dia" : "dias"})
            </span>
          </div>
          <Button type="button" size="sm" onClick={addDay} variant="outline" className="text-xs sm:text-sm w-full sm:w-auto bg-transparent">
            <Plus className="h-4 w-4 mr-1 sm:mr-2" />
            Adicionar Dia
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {days.length === 0 ? (
            <Card className="border-2 border-dashed border-border/50 bg-muted/20">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-base font-medium mb-1">Nenhum dia adicionado ainda</p>
                <p className="text-sm text-muted-foreground mb-4">Adicione dias para o plano alimentar</p>
                <Button type="button" size="sm" onClick={addDay} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Primeiro Dia
                </Button>
              </CardContent>
            </Card>
          ) : (
            days.map((day, dayIndex) => (
              <NutritionDayBlock
                key={day.id || dayIndex}
                day={day}
                onRemove={() => removeDay(dayIndex)}
                onChange={(updatedDay) => updateDay(dayIndex, updatedDay)}
              />
            ))
          )}
        </CardContent>
      )}
    </Card>
  )
}
