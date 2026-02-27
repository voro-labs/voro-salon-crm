import { DayOfWeekEnum } from "../Enums/dayOfWeekEnum.enum"
import type { MealPlanMealDto } from "./meal-plan-meal.interface"

export interface MealPlanDayDto {
  id?: string | null
  mealPlanId?: string | null
  dayOfWeek: DayOfWeekEnum
  meals?: MealPlanMealDto[]
}
