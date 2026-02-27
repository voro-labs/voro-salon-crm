"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Calendar, ChevronDown, ChevronUp } from "lucide-react"
import { WorkoutDayBlock } from "./workout-day-block"
import type { WorkoutPlanWeekDto } from "@/types/DTOs/workout-plan-week.interface"
import type { WorkoutPlanDayDto } from "@/types/DTOs/workout-plan-day.interface"
import { DayOfWeekEnum } from "@/types/Enums/dayOfWeekEnum.enum"

interface WorkoutWeekBlockProps {
  week: WorkoutPlanWeekDto
  weekIndex: number
  onRemove: () => void
  onChange: (days: WorkoutPlanDayDto[]) => void
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

export function WorkoutWeekBlock({ week, weekIndex, onRemove, onChange }: WorkoutWeekBlockProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const days = week.days || []

  const addDay = () => {
    const usedDays = days.map((d) => d.dayOfWeek)
    const availableDay = dayOptions.find((d) => !usedDays.includes(d.value))

    if (!availableDay) {
      alert("Todos os dias da semana já foram adicionados")
      return
    }

    const newDay: WorkoutPlanDayDto = {
      id: null,
      workoutPlanWeekId: week.id || null,
      dayOfWeek: availableDay.value,
      exercises: [],
    }
    onChange([...days, newDay])
  }

  const removeDay = (dayIndex: number) => {
    onChange(days.filter((_, i) => i !== dayIndex))
  }

  const updateDay = (dayIndex: number, updatedDay: WorkoutPlanDayDto) => {
    const updated = [...days]
    updated[dayIndex] = updatedDay
    onChange(updated)
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3 p-3 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button type="button" variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="h-8 w-8 shrink-0">
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2 flex-wrap">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
              <span>Semana {weekIndex + 1}</span>
              <span className="text-xs sm:text-sm text-muted-foreground font-normal">
                ({days.length} {days.length === 1 ? "dia" : "dias"})
              </span>
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" onClick={addDay} variant="outline" className="flex-1 sm:flex-none bg-transparent">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Adicionar Dia</span>
            </Button>
            <Button type="button" size="sm" onClick={onRemove} variant="destructive" className="flex-1 sm:flex-none">
              <span className="text-sm">Remover</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4 p-3 sm:p-6">
          {days.length === 0 ? (
            <Card className="border-2 border-dashed border-border/50 bg-muted/20">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-base font-medium mb-1">Nenhum dia adicionado ainda</p>
                <p className="text-sm text-muted-foreground mb-4">Adicione dias de treino para esta semana</p>
                <Button type="button" size="sm" onClick={addDay} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Primeiro Dia
                </Button>
              </CardContent>
            </Card>
          ) : (
            days.map((day, dayIndex) => (
              <WorkoutDayBlock
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
