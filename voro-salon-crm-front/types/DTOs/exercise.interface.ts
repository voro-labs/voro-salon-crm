import type { ExerciseTypeEnum } from "../Enums/exerciseTypeEnum.enum"
import { UserExtensionDto } from "./user-extension.interface"
import type { WorkoutHistoryExerciseDto } from "./workout-history-exercise.interface"
import type { WorkoutPlanExerciseDto } from "./workout-plan-exercise.interface"

export interface ExerciseDto {
  id?: string

  trainerId?: string
  trainer?: UserExtensionDto

  name?: string
  muscleGroup?: string
  type?: ExerciseTypeEnum

  thumbnail?: string
  mediaUrl?: string
  media?: string

  description?: string
  notes?: string
  alternatives?: string

  workoutPlanExercises?: WorkoutPlanExerciseDto[]
  workoutHistoryExercises?: WorkoutHistoryExerciseDto[]

  createdAt?: string
  updatedAt?: string

  isDeleted?: boolean
  deletedAt?: string
}
