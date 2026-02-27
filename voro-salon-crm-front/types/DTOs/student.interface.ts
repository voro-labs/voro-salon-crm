import type { MeasurementDto } from "./measurement.interface"
import type { WorkoutHistoryDto } from "./workout-history.interface"
import type { MealPlanDto } from "./meal-plan.interface"
import type { WorkoutPlanDto } from "./workout-plan.interface"
import type { StudentStatusEnum } from "../Enums/studentStatusEnum.enum"
import type { UserExtensionDto } from "./user-extension.interface"

export interface StudentDto {
  userExtensionId?: string
  userExtension?: UserExtensionDto
  trainerId?: string
  trainer?: UserExtensionDto
  height?: number
  weight?: number
  goal?: string
  notes?: string
  status?: StudentStatusEnum
  createdAt?: Date
  updatedAt?: Date
  measurements?: MeasurementDto[]
  workoutPlans?: WorkoutPlanDto[]
  workoutHistories?: WorkoutHistoryDto[]
  mealPlans?: MealPlanDto[]
}
