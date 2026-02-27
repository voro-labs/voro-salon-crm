import { MealPlanStatusEnum } from "../Enums/mealPlanStatusEnum.enum"
import type { MealPlanDayDto } from "./meal-plan-day.interface"
import type { StudentDto } from "./student.interface"

export interface MealPlanDto {
  id?: string | null
  studentId?: string
  student?: StudentDto
  status?: MealPlanStatusEnum
  notes?: string
  days?: MealPlanDayDto[]
  createdAt?: Date
  updatedAt?: Date
}
