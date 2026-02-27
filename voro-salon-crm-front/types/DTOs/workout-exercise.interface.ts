import type { ExerciseDto } from "./exercise.interface"

export interface WorkoutExerciseDto {
  id?: string
  workoutHistoryId?: string
  exerciseId?: string
  exercise?: ExerciseDto
  sets?: number
  reps?: number
  weight?: number
  restSeconds?: number
  notes?: string
  alternative?: string
  order?: number
}
