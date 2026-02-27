import type { ExerciseDto } from "./exercise.interface"

export interface WorkoutHistoryExerciseDto {
  id?: string
  workoutHistoryId?: string
  exerciseId?: string
  exercise?: ExerciseDto
  order?: number

  // Valores planejados (copiados do plano)
  plannedSets?: number
  plannedReps?: number
  plannedWeight?: number

  // Valores executados (o que o aluno realmente fez)
  executedSets?: number
  executedReps?: number
  executedWeight?: number

  notes?: string
  createdAt?: Date
  updatedAt?: Date
}
