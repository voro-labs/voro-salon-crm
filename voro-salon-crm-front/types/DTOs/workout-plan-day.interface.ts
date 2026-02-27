import type { DayOfWeekEnum } from "../Enums/dayOfWeekEnum.enum"
import type { WorkoutPlanExerciseDto } from "./workout-plan-exercise.interface"
import { WorkoutPlanWeekDto } from "./workout-plan-week.interface"

export interface WorkoutPlanDayDto {
  id?: string | null
  workoutPlanWeek?: WorkoutPlanWeekDto
  workoutPlanWeekId?: string | null
  dayOfWeek?: DayOfWeekEnum
  time?: string
  exercises?: WorkoutPlanExerciseDto[]
  createdAt?: Date
  updatedAt?: Date
}
