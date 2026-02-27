import type { ExerciseDto } from "./exercise.interface"

export interface WorkoutPlanExerciseDto {
  id?: string | null
  workoutPlanDayId?: string
  exerciseId?: string
  exercise?: ExerciseDto
  order?: number
  sets?: number
  reps?: number
  restInSeconds?: number
  weight?: number
  notes?: string
  alternative?: string
  createdAt?: Date
  updatedAt?: Date
}
