"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GripVertical, Plus, X, Loader2, Dumbbell } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useExercises } from "@/hooks/use-exercises.hook"
import type { WorkoutPlanExerciseDto } from "@/types/DTOs/workout-plan-exercise.interface"

interface WorkoutExerciseBlockProps {
  exercises: WorkoutPlanExerciseDto[]
  onExercisesChange: (exercises: WorkoutPlanExerciseDto[]) => void
}

export function WorkoutExerciseBlock({ exercises, onExercisesChange }: WorkoutExerciseBlockProps) {
  const { exercises: availableExercises, loading } = useExercises()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [search, setSearch] = useState("");

  const filteredAvailableExercises = availableExercises.filter((exercise) =>
    exercise?.name
      ?.toLowerCase()
      .includes(search.toLowerCase())
  );

  const addExercise = (exercise: (typeof availableExercises)[0]) => {
    const newExercise: WorkoutPlanExerciseDto = {
      id: null,
      exerciseId: exercise.id,
      exercise: exercise,
      sets: 3,
      reps: 12,
      restInSeconds: 60,
      weight: 0,
      notes: "",
      alternative: "",
      order: exercises.length,
    }
    onExercisesChange([...exercises, newExercise])
    setIsDialogOpen(false)
  }

  const removeExercise = (index: number) => {
    const updated = exercises.filter((_, i) => i !== index).map((ex, i) => ({ ...ex, order: i }))
    onExercisesChange(updated)
  }

  const updateExercise = (index: number, field: keyof WorkoutPlanExerciseDto, value: string | number) => {
    const updated = [...exercises]
    updated[index] = { ...updated[index], [field]: value }
    onExercisesChange(updated)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" variant="outline" className="w-full bg-transparent">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Exercício
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Selecionar Exercício</DialogTitle>
              <DialogDescription className="text-sm">Escolha um exercício da biblioteca</DialogDescription>
              <div className="px-3 sm:px-6">
                <Input
                  placeholder="Pesquisar exercícios..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </DialogHeader>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredAvailableExercises.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">Nenhum exercício cadastrado</p>
              </div>
            ) : (
              <div className="grid gap-2 sm:gap-3 sm:grid-cols-2">
                {filteredAvailableExercises.map((exercise) => (
                  <Card
                    key={exercise.id}
                    className="cursor-pointer hover:border-primary active:bg-muted transition-colors"
                    onClick={() => addExercise(exercise)}
                  >
                    <CardContent className="p-3 sm:p-4">
                      <h4 className="font-medium text-sm sm:text-base text-balance">{exercise.name}</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">{exercise.muscleGroup}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {exercises.length === 0 ? (
        <Card className="border-2 border-dashed border-border/50 bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Dumbbell className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum exercício adicionado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {exercises.map((exercise, index) => (
            <Card key={exercise.id || index} className="bg-background">
              <CardHeader className="pb-2 p-3 sm:pb-3 sm:p-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <div className="mt-1 cursor-grab hidden sm:block">
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm truncate">{exercise.exercise?.name || "Exercício"}</CardTitle>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {exercise.exercise?.muscleGroup || "-"}
                      </Badge>
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeExercise(index)} className="shrink-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 p-3 sm:p-6">
                <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-4">
                  <div className="space-y-1">
                    <Label htmlFor={`sets-${index}`} className="text-xs">
                      Séries
                    </Label>
                    <Input
                      id={`sets-${index}`}
                      type="number"
                      placeholder="3"
                      value={exercise.sets || ""}
                      onChange={(e) => updateExercise(index, "sets", Number(e.target.value))}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`reps-${index}`} className="text-xs">
                      Reps
                    </Label>
                    <Input
                      id={`reps-${index}`}
                      type="number"
                      placeholder="12"
                      value={exercise.reps || ""}
                      onChange={(e) => updateExercise(index, "reps", Number(e.target.value))}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`weight-${index}`} className="text-xs">
                      Peso (kg)
                    </Label>
                    <Input
                      id={`weight-${index}`}
                      type="number"
                      placeholder="80"
                      value={exercise.weight || ""}
                      onChange={(e) => updateExercise(index, "weight", Number(e.target.value))}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`rest-${index}`} className="text-xs">
                      Rest (s)
                    </Label>
                    <Input
                      id={`rest-${index}`}
                      type="number"
                      placeholder="60"
                      value={exercise.restInSeconds || ""}
                      onChange={(e) => updateExercise(index, "restInSeconds", Number(e.target.value))}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`notes-${index}`} className="text-xs">
                    Observações
                  </Label>
                  <Textarea
                    id={`notes-${index}`}
                    placeholder="Técnicas, cuidados especiais..."
                    rows={2}
                    value={exercise.notes || ""}
                    onChange={(e) => updateExercise(index, "notes", e.target.value)}
                    className="text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
