import type { WorkoutPlanDayDto } from "./workout-plan-day.interface"

export interface WorkoutPlanWeekDto {
  id?: string | null
  workoutPlanId?: string
  weekNumber?: number
  days?: WorkoutPlanDayDto[]
  createdAt?: Date
  updatedAt?: Date
}
