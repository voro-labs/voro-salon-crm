import type { WorkoutHistoryExerciseDto } from "./workout-history-exercise.interface"
import { WorkoutPlanWeekDto } from "./workout-plan-week.interface"
import { WorkoutPlanDayDto } from "./workout-plan-day.interface"
import { WorkoutPlanDto } from "./workout-plan.interface"

export interface WorkoutHistoryDto {
  id?: string
  workoutPlanDayId?: string
  executionDate?: Date
  status?: "Completed" | "Partial" | "Skipped"
  exercises?: WorkoutHistoryExerciseDto[]
  notes?: string
  createdAt?: Date
  updatedAt?: Date
  workoutPlanDay?: WorkoutPlanDayDto
}
